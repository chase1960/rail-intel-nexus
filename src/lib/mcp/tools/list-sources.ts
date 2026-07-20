import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MOCK_SOURCES } from "@/lib/mock-data";
import { CATEGORY_LABELS } from "@/lib/types";

export default defineTool({
  name: "list_sources",
  title: "列出所有信息源",
  description:
    "返回火车票情报中台配置的全部信息源(政策监管/功能竞品/舆论反馈),包括来源等级、采集方式、采集频率与关联事件数。可按 category 过滤。",
  inputSchema: {
    category: z
      .enum(["policy", "competitor", "sentiment"])
      .optional()
      .describe("按情报类型过滤: policy=政策监管, competitor=功能竞品, sentiment=舆论反馈"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category }) => {
    const list = category ? MOCK_SOURCES.filter((s) => s.category === category) : MOCK_SOURCES;
    const rows = list.map((s) => ({
      sourceId: s.sourceId,
      name: s.name,
      category: CATEGORY_LABELS[s.category],
      sourceType: s.sourceType,
      authorityLevel: s.authorityLevel,
      isOfficial: s.isOfficial,
      collectionMethod: s.collectionMethod,
      collectionFrequency: s.collectionFrequency,
      lastCollectedAt: s.lastCollectedAt,
      status: s.status,
      sourceUrl: s.sourceUrl,
      relatedEventCount: s.relatedEventCount,
    }));
    return {
      content: [{ type: "text", text: `共 ${rows.length} 条信息源\n\n${JSON.stringify(rows, null, 2)}` }],
      structuredContent: { total: rows.length, sources: rows },
    };
  },
});
