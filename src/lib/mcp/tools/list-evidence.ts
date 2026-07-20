import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MOCK_EVIDENCE } from "@/lib/mock-data";
import { CATEGORY_LABELS } from "@/lib/types";

export default defineTool({
  name: "list_evidence",
  title: "列出原文证据",
  description:
    "返回中台采集的原文证据(带原文链接、快照、来源等级、是否官方、可否作为政策依据),支持按类别或关键字过滤。",
  inputSchema: {
    category: z
      .enum(["policy", "competitor", "sentiment"])
      .optional()
      .describe("按情报类别过滤"),
    keyword: z.string().optional().describe("在标题/摘要/关键词中做包含匹配"),
    onlyOfficial: z.boolean().optional().describe("只返回官方来源的证据"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, keyword, onlyOfficial }) => {
    const kw = keyword?.toLowerCase();
    const list = MOCK_EVIDENCE.filter((e) => {
      if (category && e.category !== category) return false;
      if (onlyOfficial && !e.isOfficial) return false;
      if (kw) {
        const hay = `${e.title} ${e.summary} ${e.keywords.join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
    const rows = list.map((e) => ({
      evidenceId: e.evidenceId,
      title: e.title,
      sourceName: e.sourceName,
      category: CATEGORY_LABELS[e.category],
      authorityLevel: e.authorityLevel,
      isOfficial: e.isOfficial,
      publishedAt: e.publishedAt,
      originalUrl: e.originalUrl,
      summary: e.summary,
      keywords: e.keywords,
      canBePolicyEvidence: e.canBePolicyEvidence,
      verificationStatus: e.verificationStatus,
    }));
    return {
      content: [{ type: "text", text: `共 ${rows.length} 条证据\n\n${JSON.stringify(rows, null, 2)}` }],
      structuredContent: { total: rows.length, evidence: rows },
    };
  },
});
