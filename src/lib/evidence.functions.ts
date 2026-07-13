import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Very small hash — deterministic content signature for demo/verify purposes.
function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export const listEvidence = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("evidence_items")
      .select("*, sources(name, authority_level, is_official, category)")
      .order("collected_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data;
  });

export const createManualEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      source_id: string;
      title: string;
      author?: string;
      canonical_url?: string;
      published_at?: string | null;
      content_text: string;
      requires_login?: boolean;
      online_access_status?: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const contentHash = simpleHash(data.content_text);
    const { data: ev, error } = await context.supabase
      .from("evidence_items")
      .insert({
        source_id: data.source_id,
        title: data.title,
        author: data.author,
        canonical_url: data.canonical_url,
        published_at: data.published_at,
        collected_at: new Date().toISOString(),
        content_text: data.content_text,
        content_hash: contentHash,
        requires_login: data.requires_login ?? false,
        online_access_status: data.online_access_status ?? "unknown",
        verification_status: "unverified",
        captured_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await context.supabase.from("evidence_versions").insert({
      evidence_id: ev.id,
      version_number: 1,
      content_text: data.content_text,
      content_hash: contentHash,
      collected_at: new Date().toISOString(),
      created_by: context.userId,
    });

    await context.supabase.from("audit_logs").insert({
      entity_type: "evidence_items",
      entity_id: ev.id,
      action: "create_manual",
      after_json: ev,
      actor_id: context.userId,
    });
    return ev;
  });

/**
 * verify-evidence: deterministic multi-dimension check.
 * Runs entirely from stored data (no external network here — connection checks live in collection_runs).
 */
export const verifyEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: ev, error } = await context.supabase
      .from("evidence_items")
      .select("*, sources(*)")
      .eq("id", data.id)
      .single();
    if (error || !ev) throw new Error(error?.message ?? "evidence not found");
    const source = (ev as unknown as { sources: Record<string, unknown> }).sources;

    const blockers: string[] = [];

    // 1. source identity
    const sourceIdentity: "passed" | "warning" | "blocked" =
      source ? "passed" : (blockers.push("source_missing"), "blocked");

    // 2. accessibility — use latest collection_run
    const { data: runs } = await context.supabase
      .from("collection_runs")
      .select("*")
      .eq("source_id", ev.source_id)
      .order("started_at", { ascending: false })
      .limit(1);
    const lastRun = runs?.[0];
    let accessibility: "passed" | "warning" | "blocked" | "unavailable" = "unavailable";
    if (lastRun) {
      if (lastRun.status === "success") accessibility = "passed";
      else if (lastRun.status === "blocked") { accessibility = "blocked"; blockers.push("access_blocked"); }
      else accessibility = "warning";
    }

    // 3. metadata
    const metadata =
      ev.title && ev.canonical_url && ev.published_at ? "passed" : "warning";

    // 4. snapshot
    const { count: versionCount } = await context.supabase
      .from("evidence_versions")
      .select("*", { count: "exact", head: true })
      .eq("evidence_id", ev.id);
    const snapshot: "passed" | "unavailable" = (versionCount ?? 0) > 0 ? "passed" : "unavailable";
    if (snapshot === "unavailable") blockers.push("no_snapshot");

    // 5. content quality
    const text = ev.content_text ?? "";
    const content =
      text.length < 20
        ? "warning"
        : /登录|log in|captcha|验证码/i.test(text) && text.length < 200
          ? "blocked"
          : "passed";
    if (content === "blocked") blockers.push("login_or_captcha_body");

    // 6. freshness
    let freshness: "passed" | "warning" = "passed";
    if (ev.published_at) {
      const ageDays = (Date.now() - new Date(ev.published_at).getTime()) / 86400000;
      if (ageDays > 365) freshness = "warning";
    } else {
      freshness = "warning";
    }

    // 7. corroboration — distinct source_ids on events that reference this evidence
    const { data: eventLinks } = await context.supabase
      .from("event_evidence")
      .select("event_id")
      .eq("evidence_id", ev.id);
    let corroboration: "passed" | "warning" | "unavailable" = "unavailable";
    if (eventLinks && eventLinks.length > 0) {
      const eventIds = eventLinks.map((r) => r.event_id);
      const { data: siblings } = await context.supabase
        .from("event_evidence")
        .select("evidence_id, evidence_items!inner(source_id)")
        .in("event_id", eventIds);
      const distinctSources = new Set<string>();
      (siblings ?? []).forEach((r) => {
        const s = (r as unknown as { evidence_items: { source_id: string } }).evidence_items.source_id;
        distinctSources.add(s);
      });
      corroboration = distinctSources.size >= 2 ? "passed" : "warning";
    }

    // 8. conflict
    const { count: conflictCount } = await context.supabase
      .from("event_evidence")
      .select("*", { count: "exact", head: true })
      .eq("evidence_id", ev.id)
      .eq("relation_type", "conflicts");
    const conflict: "passed" | "warning" = (conflictCount ?? 0) > 0 ? "warning" : "passed";

    // 9. human review — presence of reviewer in linked events
    let humanReview: "passed" | "requires_manual_review" = "requires_manual_review";
    if (eventLinks && eventLinks.length > 0) {
      const { count: reviewedCount } = await context.supabase
        .from("intelligence_events")
        .select("*", { count: "exact", head: true })
        .in("id", eventLinks.map((r) => r.event_id))
        .not("reviewer", "is", null);
      if ((reviewedCount ?? 0) > 0) humanReview = "passed";
    }

    // Final result
    let finalResult: "passed" | "warning" | "blocked" | "requires_manual_review";
    if (blockers.length > 0) finalResult = "blocked";
    else if (humanReview !== "passed") finalResult = "requires_manual_review";
    else if ([metadata, content, freshness, corroboration, conflict].some((s) => s === "warning")) finalResult = "warning";
    else finalResult = "passed";

    // Determine verification_status transition
    let newVStatus = ev.verification_status;
    const requiresLogin = ev.requires_login;
    const category = source?.category;
    if (finalResult === "blocked") newVStatus = "blocked";
    else if (accessibility === "passed" && snapshot === "passed" && metadata === "passed") {
      newVStatus = "verified_online";
    } else if (requiresLogin && snapshot === "passed" && humanReview === "passed") {
      newVStatus = "verified_snapshot";
    } else if (category === "sentiment" || category === "competitor") {
      newVStatus = "lead_only";
    }

    const detailsJson = {
      source_id: ev.source_id,
      source_category: category,
      requires_login: requiresLogin,
      version_count: versionCount ?? 0,
      last_run_id: lastRun?.id ?? null,
    };

    const { data: run, error: runErr } = await context.supabase
      .from("verification_runs")
      .insert({
        evidence_id: ev.id,
        source_identity_status: sourceIdentity,
        accessibility_status: accessibility,
        metadata_status: metadata,
        snapshot_status: snapshot,
        content_status: content,
        freshness_status: freshness,
        corroboration_status: corroboration,
        conflict_status: conflict,
        human_review_status: humanReview,
        final_result: finalResult,
        blockers,
        details_json: detailsJson,
      })
      .select()
      .single();
    if (runErr) throw new Error(runErr.message);

    await context.supabase
      .from("evidence_items")
      .update({
        verification_status: newVStatus,
        last_verified_at: new Date().toISOString(),
        verification_reason: blockers.length ? `blockers: ${blockers.join(",")}` : `final=${finalResult}`,
        can_be_policy_evidence: category === "policy" && finalResult === "passed" && source?.is_official === true,
      })
      .eq("id", ev.id);

    return run;
  });
