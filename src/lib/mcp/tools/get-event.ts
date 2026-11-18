import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSnapshot } from "../snapshot";
import { EVENT_TYPE_LABELS, STATUS_LABELS, MODULE_LABELS } from "@/lib/types";

export default defineTool({
  name: "get_event",
  title: "获取情报事件详情",
  description:
    "根据 eventId 返回完整情报事件：参考意见（立场/依据/证伪条件/验证动作/使用边界）、评分时间线、冲突标记、产品影响矩阵与展开的证据原文。",
  inputSchema: {
    eventId: z.string().describe("情报事件 ID，例如 evt_xxx（可由 list_events 获取）"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ eventId }) => {
    const { events, evidence, run } = getSnapshot();
    const event = events.find((e) => e.eventId === eventId);
    if (!event) {
      return {
        content: [{ type: "text", text: `未找到事件 ${eventId}。请先调用 list_events 获取可用 ID。` }],
        isError: true,
      };
    }
    const related = event.relatedEvidenceIds
      .map((id) => evidence.find((ev) => ev.evidenceId === id))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map((ev) => ({
        evidenceId: ev.evidenceId,
        title: ev.title,
        sourceName: ev.sourceName,
        authorityLevel: ev.authorityLevel,
        isOfficial: ev.isOfficial,
        publishedAt: ev.publishedAt,
        originalUrl: ev.originalUrl,
        summary: ev.summary,
        score: ev.score?.total,
        scoreGrade: ev.score?.grade,
        verificationStatus: ev.verificationStatus,
        canBePolicyEvidence: ev.canBePolicyEvidence,
      }));

    const detail = {
      runId: run.runId,
      dataOrigin: run.dataOrigin,
      eventId: event.eventId,
      title: event.title,
      eventType: EVENT_TYPE_LABELS[event.eventType],
      riskLevel: event.riskLevel,
      status: STATUS_LABELS[event.status],
      sentiment: event.sentiment,
      confidence: event.confidence,
      affectedUsers: event.affectedUsers,
      affectedModules: event.affectedModules.map((m) => MODULE_LABELS[m]),
      summary: event.summary,
      sourceSummary: event.sourceSummary,
      confidenceLevel: event.confidenceLevel,
      opinion: event.opinion,
      timeline: event.timeline,
      conflicts: event.conflicts,
      productImpact: event.productImpact.map((p) => ({
        module: MODULE_LABELS[p.module],
        impactLevel: p.impactLevel,
        reason: p.reason,
        suggestedAction: p.suggestedAction,
        owner: p.owner,
        ruleId: p.ruleId,
        evidenceIds: p.evidenceIds,
      })),
      recommendedActions: event.recommendedActions,
      owner: event.owner,
      updatedAt: event.updatedAt,
      evidence: related,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
      structuredContent: detail,
    };
  },
});
