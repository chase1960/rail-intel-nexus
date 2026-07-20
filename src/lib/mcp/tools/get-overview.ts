import { defineTool } from "@lovable.dev/mcp-js";
import { MOCK_SOURCES, MOCK_TASKS, MOCK_EVIDENCE, MOCK_EVENTS } from "@/lib/mock-data";

export default defineTool({
  name: "get_overview",
  title: "获取情报中台总览",
  description:
    "返回中台运行总览:信息源数量、今日采集任务、生成的证据条目、聚合事件、P1/P2/P3 分布、按类别分布,用于快速掌握当前情报态势。",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const byRisk = { P1: 0, P2: 0, P3: 0 } as Record<string, number>;
    for (const e of MOCK_EVENTS) byRisk[e.riskLevel]++;
    const byCategory = { policy: 0, competitor: 0, sentiment: 0 } as Record<string, number>;
    for (const s of MOCK_SOURCES) byCategory[s.category]++;
    const overview = {
      sources: {
        total: MOCK_SOURCES.length,
        byCategory,
        active: MOCK_SOURCES.filter((s) => s.status === "active").length,
      },
      tasks: {
        total: MOCK_TASKS.length,
        success: MOCK_TASKS.filter((t) => t.status === "success").length,
        failed: MOCK_TASKS.filter((t) => t.status === "failed").length,
        foundChange: MOCK_TASKS.filter((t) => t.foundChange).length,
      },
      evidence: {
        total: MOCK_EVIDENCE.length,
        official: MOCK_EVIDENCE.filter((e) => e.isOfficial).length,
        policyGrade: MOCK_EVIDENCE.filter((e) => e.canBePolicyEvidence).length,
      },
      events: {
        total: MOCK_EVENTS.length,
        byRisk,
        pendingReview: MOCK_EVENTS.filter((e) => e.status === "unverified" || e.status === "product_review").length,
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
      structuredContent: overview,
    };
  },
});
