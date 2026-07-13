import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, unknown>) => input)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sources")
      .upsert(data as never)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testSourceConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    // Load source
    const { data: source, error: srcErr } = await context.supabase
      .from("sources")
      .select("*")
      .eq("id", data.id)
      .single();
    if (srcErr || !source) throw new Error(srcErr?.message ?? "source not found");

    // For login/internal/oauth modes we cannot test in the worker: return blocked with real reason.
    if (source.access_mode !== "public_web" && source.access_mode !== "public_api") {
      const newStatus =
        source.access_mode === "login_manual"
          ? "login_required"
          : source.access_mode === "oauth_api"
            ? "auth_required"
            : source.access_mode === "internal_connector"
              ? "unconfigured"
              : "unconfigured";
      await context.supabase
        .from("sources")
        .update({
          connection_status: newStatus,
          last_tested_at: new Date().toISOString(),
          last_error_code: "not_testable",
          last_error_message: `access_mode=${source.access_mode} 无法在服务端自动测试，需人工取证或外部服务`,
        })
        .eq("id", source.id);
      await context.supabase.from("collection_runs").insert({
        source_id: source.id,
        run_type: "manual",
        status: "blocked",
        finished_at: new Date().toISOString(),
        error_code: "not_testable",
        error_message: `access_mode=${source.access_mode}`,
      });
      return { status: newStatus, message: "该接入模式无法自动测试" };
    }

    const start = Date.now();
    const runInsert = await context.supabase
      .from("collection_runs")
      .insert({ source_id: source.id, run_type: "manual", status: "running" })
      .select()
      .single();
    const runId = runInsert.data?.id;

    let httpStatus: number | null = null;
    let responseTimeMs = 0;
    let redirectUrl: string | null = null;
    let errorCode: string | null = null;
    let errorMessage: string | null = null;
    let logExcerpt: string | null = null;
    let newStatus: "connected" | "degraded" | "blocked" | "failed" = "failed";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(source.source_url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "TTIH-Bot/1.0 (+internal)" },
      });
      clearTimeout(timeout);
      responseTimeMs = Date.now() - start;
      httpStatus = res.status;
      redirectUrl = res.url !== source.source_url ? res.url : null;
      const text = await res.text();
      logExcerpt = text.slice(0, 500);

      if (res.status >= 500) {
        newStatus = "failed";
        errorCode = `http_${res.status}`;
        errorMessage = `目标站服务器错误 ${res.status}`;
      } else if (res.status === 429) {
        newStatus = "blocked";
        errorCode = "rate_limited";
        errorMessage = "被限流 429";
      } else if (res.status === 401 || res.status === 403) {
        newStatus = "auth_required";
        errorCode = `http_${res.status}`;
        errorMessage = "需要授权";
      } else if (res.status === 404) {
        newStatus = "failed";
        errorCode = "http_404";
        errorMessage = "页面不存在";
      } else if (res.status >= 200 && res.status < 400) {
        const lower = text.toLowerCase();
        const looksLikeLogin = /登录|log\s*in|sign\s*in|passport/i.test(text) && text.length < 5000;
        const looksLikeCaptcha = /captcha|验证码|滑块/i.test(text);
        if (looksLikeCaptcha) {
          newStatus = "blocked";
          errorCode = "captcha";
          errorMessage = "响应包含验证码/滑块";
        } else if (looksLikeLogin) {
          newStatus = "login_required";
          errorCode = "login_wall";
          errorMessage = "疑似登录墙";
        } else if (text.trim().length < 100) {
          newStatus = "degraded";
          errorCode = "empty_body";
          errorMessage = "响应正文过短";
        } else {
          newStatus = "connected";
        }
        void lower;
      }
    } catch (err) {
      responseTimeMs = Date.now() - start;
      errorCode = "network_error";
      errorMessage = err instanceof Error ? err.message : String(err);
      newStatus = "failed";
    }

    const patch = {
      connection_status: newStatus,
      last_tested_at: new Date().toISOString(),
      last_success_at: newStatus === "connected" ? new Date().toISOString() : source.last_success_at,
      last_error_code: newStatus === "connected" ? null : errorCode,
      last_error_message: newStatus === "connected" ? null : errorMessage,
    };
    await context.supabase.from("sources").update(patch).eq("id", source.id);

    if (runId) {
      await context.supabase
        .from("collection_runs")
        .update({
          finished_at: new Date().toISOString(),
          status: newStatus === "connected" ? "success" : "failed",
          http_status: httpStatus,
          response_time_ms: responseTimeMs,
          redirect_url: redirectUrl,
          error_code: errorCode,
          error_message: errorMessage,
          log_excerpt: logExcerpt,
        })
        .eq("id", runId);
    }

    return {
      status: newStatus,
      httpStatus,
      responseTimeMs,
      redirectUrl,
      errorCode,
      errorMessage,
    };
  });

export const listCollectionRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sourceId?: string; limit?: number }) => input)
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("collection_runs").select("*").order("started_at", { ascending: false });
    if (data.sourceId) q = q.eq("source_id", data.sourceId);
    if (data.limit) q = q.limit(data.limit);
    else q = q.limit(50);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows;
  });
