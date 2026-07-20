import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MOCK_EVENTS, MOCK_EVIDENCE } from "@/lib/mock-data";
import { EVENT_TYPE_LABELS, STATUS_LABELS, MODULE_LABELS } from "@/lib/types";

export default defineTool({
  name: "get_event",
  title: "获取情报事件详情",
  description:
    "根据 eventId 返回完整情报事件,包括产品影响矩阵、推荐动作、可信度维度、以及展开的证据原文列表(来自证据库)。",
  inputSchema: {
    eventId: z.string().describe("情报事件 ID,例如 evt-01"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ eventId }) => {
    const event = MOCK_EVENTS.find((e) => e.eventId === eventId);
    if (!event) {
      return {
        content: [{ type: "text", text: `未找到事件 ${eventId}` }],
        isError: true,
      };
    }
    const evidence = event.relatedEvidenceIds
      .map((id) => MOCK_EVIDENCE.find((ev) => ev.evidenceId === id))
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
      }));
    const detail = {
      eventId: event.eventId,
      title: event.title,
      eventType: EVENT_TYPE_LABELS[event.eventType],
      riskLevel: event.riskLevel,
      status: STATUS_LABELS[event.status],
      sentiment: event.sentiment,
      affectedUsers: event.affectedUsers,
      affectedModules: event.affectedModules.map((m) => MODULE_LABELS[m]),
      summary: event.summary,
      sourceSummary: event.sourceSummary,
      confidenceLevel: event.confidenceLevel,
      productImpact: event.productImpact.map((p) => ({
        module: MODULE_LABELS[p.module],
        impactLevel: p.impactLevel,
        reason: p.reason,
        suggestedAction: p.suggestedAction,
        owner: p.owner,
        evidenceIds: p.evidenceIds,
      })),
      recommendedActions: event.recommendedActions,
      owner: event.owner,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      evidence,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
      structuredContent: detail,
    };
  },
});
