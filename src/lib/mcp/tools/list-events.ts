import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSnapshot } from "../snapshot";
import { EVENT_TYPE_LABELS, STATUS_LABELS, MODULE_LABELS } from "@/lib/types";

export default defineTool({
  name: "list_events",
  title: "列出情报事件",
  description:
    "返回引擎现场聚合出的情报事件（政策变化、竞品功能、舆情热点、投诉高发等），含风险等级、置信度、参考意见立场与影响模块。可按等级/状态/类型过滤。",
  inputSchema: {
    riskLevel: z.enum(["P1", "P2", "P3"]).optional().describe("按风险等级过滤"),
    status: z
      .enum([
        "new",
        "evidence_check",
        "human_review",
        "confirmed",
        "product_review",
        "action_planned",
        "assigned",
        "in_progress",
        "effect_review",
        "closed",
        "watching",
        "invalid_lead",
      ])
      .optional()
      .describe("按事件工作流状态过滤"),
    eventType: z
      .enum(["policy_change", "competitor_feature", "sentiment_hot", "complaint_spike", "regulatory_risk", "product_opportunity"])
      .optional()
      .describe("按事件类型过滤"),
    stance: z.enum(["act", "watch", "hold"]).optional().describe("按参考意见立场过滤"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ riskLevel, status, eventType, stance }) => {
    const { events, run } = getSnapshot();
    const list = events.filter(
      (e) =>
        (!riskLevel || e.riskLevel === riskLevel) &&
        (!status || e.status === status) &&
        (!eventType || e.eventType === eventType) &&
        (!stance || e.opinion?.stance === stance),
    );
    const rows = list.map((e) => ({
      eventId: e.eventId,
      title: e.title,
      eventType: EVENT_TYPE_LABELS[e.eventType],
      riskLevel: e.riskLevel,
      status: STATUS_LABELS[e.status],
      sentiment: e.sentiment,
      confidence: e.confidence,
      stance: e.opinion?.stance,
      opinionHeadline: e.opinion?.headline,
      affectedUsers: e.affectedUsers,
      affectedModules: e.affectedModules.map((m) => MODULE_LABELS[m]),
      summary: e.summary,
      evidenceCount: e.evidenceCount,
      distinctSourceCount: e.distinctSourceCount,
      relatedEvidenceIds: e.relatedEvidenceIds,
      owner: e.owner,
      updatedAt: e.updatedAt,
    }));
    return {
      content: [
        {
          type: "text",
          text: `共 ${rows.length} 条情报事件（运行 ${run.runId}，数据来源 ${run.dataOrigin}）\n\n${JSON.stringify(rows, null, 2)}`,
        },
      ],
      structuredContent: { total: rows.length, runId: run.runId, dataOrigin: run.dataOrigin, events: rows },
    };
  },
});
