// Server functions for evidence — auth removed for demo, uses supabaseAdmin.
import { createServerFn } from "@tanstack/react-start";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export const listEvidence = createServerFn({ method: "GET" }).handler(async () => {
  const sb = await admin();
  const { data, error } = await sb
    .from("evidence_items")
    .select("*, sources(name, authority_level, is_official, category)")
    .order("collected_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return data;
});

export const createManualEvidence = createServerFn({ method: "POST" })
  .inputValidator((input: {
    source_id: string;
    title: string;
    author?: string;
    canonical_url?: string;
    published_at?: string | null;
    content_text: string;
    requires_login?: boolean;
    online_access_status?: string;
  }) => input)
  .handler(async ({ data }) => {
    const sb = await admin();
    const contentHash = simpleHash(data.content_text);
    const { data: ev, error } = await sb
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
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await sb.from("evidence_versions").insert({
      evidence_id: ev.id,
      version_number: 1,
      content_text: data.content_text,
      content_hash: contentHash,
      collected_at: new Date().toISOString(),
    });

    await sb.from("audit_logs").insert({
      entity_type: "evidence_items",
      entity_id: ev.id,
      action: "create_manual",
      after_json: ev,
    });
    return ev;
  });

export const verifyEvidence = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: ev, error } = await sb.from("evidence_items").select("*, sources(*)").eq("id", data.id).single();
    if (error || !ev) throw new Error(error?.message ?? "evidence not found");
    const source = (ev as unknown as { sources: Record<string, unknown> }).sources;
    const blockers: string[] = [];

    const sourceIdentity: "passed" | "warning" | "blocked" = source ? "passed" : (blockers.push("source_missing"), "blocked");
    const { data: runs } = await sb.from("collection_runs").select("*").eq("source_id", ev.source_id).order("started_at", { ascending: false }).limit(1);
    const lastRun = runs?.[0];
    let accessibility: "passed" | "warning" | "blocked" | "unavailable" = "unavailable";
    if (lastRun) {
      if (lastRun.status === "success") accessibility = "passed";
      else if (lastRun.status === "blocked") { accessibility = "blocked"; blockers.push("access_blocked"); }
      else accessibility = "warning";
    }
    const metadata = ev.title && ev.canonical_url && ev.published_at ? "passed" : "warning";
    const { count: versionCount } = await sb.from("evidence_versions").select("*", { count: "exact", head: true }).eq("evidence_id", ev.id);
    const snapshot: "passed" | "unavailable" = (versionCount ?? 0) > 0 ? "passed" : "unavailable";
    if (snapshot === "unavailable") blockers.push("no_snapshot");
    const text = ev.content_text ?? "";
    const content = text.length < 20 ? "warning" : (/登录|log in|captcha|验证码/i.test(text) && text.length < 200 ? "blocked" : "passed");
    if (content === "blocked") blockers.push("login_or_captcha_body");
    let freshness: "passed" | "warning" = "passed";
    if (ev.published_at) {
      const ageDays = (Date.now() - new Date(ev.published_at).getTime()) / 86400000;
      if (ageDays > 365) freshness = "warning";
    } else freshness = "warning";

    const corroboration: "passed" | "warning" | "unavailable" = "unavailable";
    const conflict: "passed" | "warning" = "passed";
    const humanReview = "requires_manual_review" as const;

    let finalResult: "passed" | "warning" | "blocked" | "requires_manual_review";
    if (blockers.length > 0) finalResult = "blocked";
    else finalResult = humanReview;

    let newVStatus = ev.verification_status;
    const category = source?.category;
    if (finalResult === "blocked") newVStatus = "blocked";
    else if (accessibility === "passed" && snapshot === "passed" && metadata === "passed") newVStatus = "verified_online";
    else if (ev.requires_login && snapshot === "passed") newVStatus = "verified_snapshot";
    else if (category === "sentiment" || category === "competitor") newVStatus = "lead_only";

    const { data: run, error: runErr } = await sb.from("verification_runs").insert({
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
      details_json: { source_id: ev.source_id, source_category: String(category ?? ""), version_count: versionCount ?? 0, last_run_id: lastRun?.id ?? null },
    }).select().single();
    if (runErr) throw new Error(runErr.message);

    await sb.from("evidence_items").update({
      verification_status: newVStatus,
      last_verified_at: new Date().toISOString(),
      verification_reason: blockers.length ? `blockers: ${blockers.join(",")}` : `final=${finalResult}`,
      can_be_policy_evidence: category === "policy" && (finalResult as string) === "passed" && source?.is_official === true,
    }).eq("id", ev.id);

    return run;
  });

// Seed two sample evidence rows tied to the seeded sources (if present).
export const seedSampleEvidence = createServerFn({ method: "POST" }).handler(async () => {
  const sb = await admin();
  const { data: sources } = await sb.from("sources").select("id, name").in("name", ["中国国家铁路集团 · 新闻公告", "12306 · 常见问题与规则"]);
  if (!sources || sources.length === 0) throw new Error("请先在信息源管理页种入示例来源");
  const map = new Map(sources.map((s) => [s.name, s.id]));
  const samples = [
    {
      title: "国铁集团发布暑运方案：加开旅客列车 1500 列",
      source_id: map.get("中国国家铁路集团 · 新闻公告")!,
      canonical_url: "https://www.china-railway.com.cn/xwzx/tljs/example-summer-plan",
      author: "国铁集团新闻中心",
      content_text: "为满足旅客出行需求，国铁集团决定在暑运期间加开旅客列车 1500 列，重点覆盖京沪、京广等热门方向。学生票、务工人员团体票预约通道保持畅通。",
    },
    {
      title: "12306 更新退改签规则说明",
      source_id: map.get("12306 · 常见问题与规则")!,
      canonical_url: "https://www.12306.cn/mormhweb/kyfw/example-refund-rules",
      author: "12306 客服中心",
      content_text: "开车前 8 天以上（含 8 天）退票的，不收取退票费；开车前 48 小时以上、8 天以内的按票价 5% 收取，48 小时至 24 小时内按 10%，24 小时以内按 20%。改签遵循同规则。",
    },
  ];
  const { data: existing } = await sb.from("evidence_items").select("title").in("title", samples.map((s) => s.title));
  const skip = new Set((existing ?? []).map((r) => r.title));
  let inserted = 0;
  for (const s of samples) {
    if (skip.has(s.title)) continue;
    const contentHash = simpleHash(s.content_text);
    const { data: ev } = await sb.from("evidence_items").insert({
      ...s,
      published_at: new Date().toISOString(),
      collected_at: new Date().toISOString(),
      content_hash: contentHash,
      requires_login: false,
      online_access_status: "reachable",
      verification_status: "unverified",
      data_origin: "sample",
    }).select().single();
    if (ev) {
      await sb.from("evidence_versions").insert({
        evidence_id: ev.id, version_number: 1,
        content_text: s.content_text, content_hash: contentHash,
        collected_at: new Date().toISOString(),
      });
      inserted++;
    }
  }
  return { inserted, skipped: samples.length - inserted };
});
