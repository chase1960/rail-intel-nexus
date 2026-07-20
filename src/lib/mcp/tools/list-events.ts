import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { EVENT_TYPE_LABELS, STATUS_LABELS, MODULE_LABELS } from "@/lib/types";

export default defineTool({
  name: "list_events",
  title: "列出情报事件",
  description:
    "返回中台聚合出的高价值情报事件(政策变化、竞品功能、舆情热点、投诉高发等)。可按风险等级或事件状态过滤。",
  inputSchema: {
    riskLevel: z.enum(["P1", "P2", "P3"]).optional().describe("按风险等级过滤"),
    status: z
      .enum(["unverified", "confirmed", "lead", "product_review", "in_progress", "done", "watching"])
      .optional()
      .describe("按事件处理状态过滤"),
    eventType: z
      .enum([
        "policy_change",
        "competitor_feature",
        "sentiment_hot",
        "complaint_spike",
        "regulatory_risk",
        "product_opportunity",
      ])
      .optional()
      .describe("按事件类型过滤"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ riskLevel, status, eventType }) => {
    const list = MOCK_EVENTS.filter(
      (e) =>
        (!riskLevel || e.riskLevel === riskLevel) &&
        (!status || e.status === status) &&
        (!eventType || e.eventType === eventType),
    );
    const rows = list.map((e) => ({
      eventId: e.eventId,
      title: e.title,
      eventType: EVENT_TYPE_LABELS[e.eventType],
      riskLevel: e.riskLevel,
      status: STATUS_LABELS[e.status],
      sentiment: e.sentiment,
      affectedUsers: e.affectedUsers,
      affectedModules: e.affectedModules.map((m) => MODULE_LABELS[m]),
      summary: e.summary,
      relatedEvidenceIds: e.relatedEvidenceIds,
      owner: e.owner,
      updatedAt: e.updatedAt,
    }));
    return {
      content: [{ type: "text", text: `共 ${rows.length} 条情报事件\n\n${JSON.stringify(rows, null, 2)}` }],
      structuredContent: { total: rows.length, events: rows },
    };
  },
});
