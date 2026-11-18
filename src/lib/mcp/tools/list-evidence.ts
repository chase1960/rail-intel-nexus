import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSnapshot } from "../snapshot";
import { CATEGORY_LABELS, MODULE_LABELS, EVIDENCE_STATUS_LABELS } from "@/lib/types";

export default defineTool({
  name: "list_evidence",
  title: "检索原文证据",
  description:
    "返回证据库条目：评分拆解（权威度/可核验/多源印证/时效/密度）、校验状态、是否可作为政策依据、冲突对象。可按分类、来源、最低分或校验状态过滤。",
  inputSchema: {
    category: z.enum(["policy", "competitor", "sentiment"]).optional().describe("按情报分类过滤"),
    sourceId: z.string().optional().describe("按来源 ID 过滤，例如 src-01"),
    minScore: z.number().min(0).max(100).optional().describe("只返回总分不低于该值的证据"),
    verificationStatus: z
      .enum(["unverified", "verifying", "verified_online", "verified_snapshot", "lead_only", "conflict", "blocked", "obsolete"])
      .optional()
      .describe("按校验状态过滤"),
    limit: z.number().min(1).max(50).optional().describe("返回条数上限，默认 10"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, sourceId, minScore, verificationStatus, limit }) => {
    const { evidence, run } = getSnapshot();
    const rows = evidence
      .filter(
        (e) =>
          (!category || e.category === category) &&
          (!sourceId || e.sourceId === sourceId) &&
          (!minScore || (e.score?.total ?? 0) >= minScore) &&
          (!verificationStatus || e.verificationStatus === verificationStatus),
      )
      .sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0))
      .slice(0, limit ?? 10)
      .map((e) => ({
        evidenceId: e.evidenceId,
        title: e.title,
        sourceId: e.sourceId,
        sourceName: e.sourceName,
        authorityLevel: e.authorityLevel,
        isOfficial: e.isOfficial,
        category: CATEGORY_LABELS[e.category],
        publishedAt: e.publishedAt,
        originalUrl: e.originalUrl,
        summary: e.summary,
        score: e.score?.total,
        scoreGrade: e.score?.grade,
        dimensions: e.score?.dimensions.map((d) => ({ label: d.label, points: d.points, note: d.note })),
        verificationStatus: EVIDENCE_STATUS_LABELS[e.verificationStatus],
        canBePolicyEvidence: e.canBePolicyEvidence,
        conflictWith: e.conflictWith,
        entityHints: e.entityHints?.map((m) => MODULE_LABELS[m]),
        quotedByEvents: e.quotedByEvents,
        dataOrigin: e.dataOrigin,
      }));
    return {
      content: [
        {
          type: "text",
          text: `共 ${rows.length} 条证据（运行 ${run.runId}，数据来源 ${run.dataOrigin}）\n\n${JSON.stringify(rows, null, 2)}`,
        },
      ],
      structuredContent: { total: rows.length, runId: run.runId, dataOrigin: run.dataOrigin, evidence: rows },
    };
  },
});
