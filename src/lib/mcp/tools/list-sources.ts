import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSnapshot } from "../snapshot";
import { SOURCES } from "@/lib/engine/source-registry";
import { CATEGORY_LABELS } from "@/lib/types";

export default defineTool({
  name: "list_sources",
  title: "列出所有信息源",
  description:
    "返回信息源注册表：权威级别、访问方式（公网/登录态/内部接口）、连接状态、抓取策略，以及本轮该源的真实产出（原文数/有效证据数/去重数）。",
  inputSchema: {
    category: z
      .enum(["policy", "competitor", "sentiment"])
      .optional()
      .describe("按情报类型过滤：policy=政策监管, competitor=功能竞品, sentiment=舆论反馈"),
    connectionStatus: z
      .enum(["unconfigured", "testing", "connected", "degraded", "auth_required", "login_required", "blocked", "failed", "disabled"])
      .optional()
      .describe("按连接状态过滤，例如只看 connected 的源"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, connectionStatus }) => {
    const { coverage } = getSnapshot();
    const list = SOURCES.filter(
      (s) =>
        (!category || s.category === category) &&
        (!connectionStatus || s.connectionStatus === connectionStatus),
    );
    const rows = list.map((s) => {
      const cov = coverage.find((c) => c.sourceId === s.sourceId);
      return {
        sourceId: s.sourceId,
        name: s.name,
        category: CATEGORY_LABELS[s.category],
        sourceType: s.sourceType,
        authorityLevel: s.authorityLevel,
        isOfficial: s.isOfficial,
        accessMode: s.accessMode,
        connectionStatus: s.connectionStatus,
        fetchStrategy: s.fetchStrategy,
        requiresAuth: s.requiresAuth,
        reliability: s.reliability,
        sourceUrl: s.sourceUrl,
        docsThisRun: cov?.docs ?? 0,
        newEvidenceThisRun: cov?.newEvidence ?? 0,
        duplicatesThisRun: cov?.duplicates ?? 0,
      };
    });
    return {
      content: [{ type: "text", text: `共 ${rows.length} 条信息源\n\n${JSON.stringify(rows, null, 2)}` }],
      structuredContent: { total: rows.length, sources: rows },
    };
  },
});
