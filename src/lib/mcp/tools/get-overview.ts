import { defineTool } from "@lovable.dev/mcp-js";
import { getSnapshot } from "../snapshot";
import { SOURCES } from "@/lib/engine/source-registry";
import { MODULE_LABELS } from "@/lib/types";

export default defineTool({
  name: "get_overview",
  title: "获取情报中台总览",
  description:
    "返回本轮流水线的总览：运行信息、源覆盖、证据与事件数量、风险分布、最高优先级事件的一句话结论（含参考意见）。适合作为内部 Agent 的入口调用。",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const { run, events, evidence, coverage, report } = getSnapshot();
    const byRisk = { P1: 0, P2: 0, P3: 0 } as Record<string, number>;
    for (const e of events) byRisk[e.riskLevel] = (byRisk[e.riskLevel] ?? 0) + 1;
    const top = [...events].sort(
      (a, b) =>
        ({ P1: 0, P2: 1, P3: 2 }[a.riskLevel] ?? 3) - ({ P1: 0, P2: 1, P3: 2 }[b.riskLevel] ?? 3) ||
        (b.confidence ?? 0) - (a.confidence ?? 0),
    )[0];

    const overview = {
      run: {
        runId: run.runId,
        finishedAt: run.finishedAt,
        dataOrigin: run.dataOrigin,
        rawDocuments: run.rawDocuments,
        newEvidence: run.newEvidence,
        duplicateEvidence: run.duplicateEvidence,
        eventsCreated: run.eventsCreated,
        lowQualityBlocked: run.lowQualityBlocked,
        memoryVersion: run.memoryVersion,
        stages: run.stages.map((s) => ({ stageId: s.stageId, name: s.name, in: s.inputCount, out: s.outputCount, ms: s.durationMs })),
      },
      sources: {
        declared: SOURCES.length,
        withDocs: coverage.filter((c) => c.docs > 0).length,
        connected: SOURCES.filter((s) => s.connectionStatus === "connected").length,
        loginRequired: SOURCES.filter((s) => s.connectionStatus === "login_required").length,
      },
      evidence: {
        total: evidence.length,
        official: evidence.filter((e) => e.isOfficial).length,
        policyGrade: evidence.filter((e) => e.canBePolicyEvidence).length,
        conflict: evidence.filter((e) => e.verificationStatus === "conflict").length,
        blocked: evidence.filter((e) => e.verificationStatus === "blocked").length,
      },
      events: {
        total: events.length,
        byRisk,
        pendingReview: events.filter((e) => e.status === "human_review").length,
        act: events.filter((e) => e.opinion?.stance === "act").length,
      },
      topEvent: top
        ? {
            eventId: top.eventId,
            title: top.title,
            riskLevel: top.riskLevel,
            confidence: top.confidence,
            affectedModules: top.affectedModules.map((m) => MODULE_LABELS[m]),
            opinion: top.opinion?.headline,
            stance: top.opinion?.stance,
          }
        : null,
      conclusion: report.summary,
      disclaimer:
        run.dataOrigin === "sample"
          ? "本期为样本语料演示（时间相对当前生成），非真实抓取；结论仅用于内部排序与验证。"
          : "本期为实时采集结果，仍需人工核对 S/A 级原文后再对外使用。",
    };

    return {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
      structuredContent: overview,
    };
  },
});
