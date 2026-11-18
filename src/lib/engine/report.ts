import type { EvidenceItem, IntelligenceEvent, MemorySnapshot, PipelineRun, Report } from "@/lib/types";
import { CATEGORY_LABELS, EVENT_TYPE_LABELS, MODULE_LABELS } from "@/lib/types";
import { formatDateTime, weekdayCn } from "./dates";

export interface ReportInput {
  events: IntelligenceEvent[];
  evidence: EvidenceItem[];
  run: PipelineRun;
  memory: MemorySnapshot;
  type: "daily" | "weekly" | "topic";
  now: Date;
}

const RISK_ORDER = { P1: 0, P2: 1, P3: 2 } as const;

export function generateReport(input: ReportInput): Report {
  const { events, evidence, run, memory, type, now } = input;
  const sorted = [...events].sort(
    (a, b) =>
      RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel] ||
      (b.confidence ?? 0) - (a.confidence ?? 0),
  );
  const p1 = sorted.filter((e) => e.riskLevel === "P1");
  const conflicts = evidence.filter((e) => e.verificationStatus === "conflict");
  const top = sorted[0];

  const conclusion = top
    ? `本轮 ${events.length} 个情报事件中 ${p1.length} 个 P1：最高优先级为「${top.title}」（${EVENT_TYPE_LABELS[top.eventType]}，置信度 ${top.confidence ?? 0}%），建议先做「${top.productImpact[0]?.suggestedAction ?? "补充官方原文"}」的低成本验证；其余 ${events.length - p1.length} 个进入观察队列。`
    : "本轮未形成可行动情报事件，建议检查采集覆盖与源可达性。";

  const metrics: Record<string, number> = {
    events: events.length,
    p1: p1.length,
    p2: sorted.filter((e) => e.riskLevel === "P2").length,
    evidence: evidence.length,
    conflicts: conflicts.length,
    sources: new Set(evidence.map((e) => e.sourceId)).size,
  };

  const range =
    type === "daily"
      ? `${formatDateTime(now.toISOString()).slice(0, 10)}（${weekdayCn(now.toISOString())}）`
      : type === "weekly"
        ? `${formatDateTime(new Date(now.getTime() - 7 * 86400_000).toISOString()).slice(0, 10)} ~ ${formatDateTime(now.toISOString()).slice(0, 10)}`
        : `专题：${top?.clusterKey ?? "全部"}`;

  const sections: string[] = [];
  let index = 0;
  const h = () => `## ${++index}. `;

  sections.push(`${h()}一句话结论\n\n> ${conclusion}`);

  sections.push(
    `${h()}运行概况\n\n` +
      `| 指标 | 数值 |\n| --- | --- |\n` +
      `| 运行 ID | \`${run.runId}\` |\n` +
      `| 数据来源 | ${run.dataOrigin === "sample" ? "样本语料（相对时间生成，可复现）" : "实时采集"} |\n` +
      `| 原始文档 | ${run.rawDocuments} |\n` +
      `| 新增证据 | ${run.newEvidence} |\n` +
      `| 去重命中 | ${run.duplicateEvidence}（其中跨源近重复 ${run.stages.find((s) => s.stageId === "dedupe")?.metrics.nearDuplicate ?? 0}） |\n` +
      `| 低分拦截 | ${run.lowQualityBlocked} |\n` +
      `| 形成事件 | ${run.eventsCreated} |\n` +
      `| 记忆版本 | v${run.memoryVersion} |\n`,
  );

  const highEvents = sorted.filter((e) => e.riskLevel !== "P3").slice(0, 4);
  sections.push(`${h()}高优先级事件与参考意见\n\n${highEvents.map((e, i) => renderEvent(e, i + 1)).join("\n\n")}`);

  const byCategory = (category: string) =>
    sorted.filter((e) => {
      const first = evidence.find((ev) => ev.evidenceId === e.relatedEvidenceIds[0]);
      return first?.category === category;
    });

  for (const category of ["policy", "competitor", "sentiment"] as const) {
    const items = byCategory(category);
    sections.push(
      `${h()}${CATEGORY_LABELS[category]}（${items.length}）\n\n` +
        (items.length === 0
          ? "本轮无新增。"
          : items
              .map(
                (e) =>
                  `- **${e.riskLevel}** ${e.title}｜${e.confidence ?? 0}%｜${e.sourceSummary}`,
              )
              .join("\n")),
    );
  }

  const impacts = sorted
    .flatMap((e) => e.productImpact.map((impact) => ({ event: e, impact })))
    .filter((row) => row.impact.impactLevel !== "none");
  sections.push(
    `${h()}产品影响矩阵\n\n| 模块 | 影响 | 原因 | 建议动作 | 负责人 | 来源事件 |\n| --- | --- | --- | --- | --- | --- |\n` +
      impacts
        .map(
          ({ event, impact }) =>
            `| ${MODULE_LABELS[impact.module]} | ${impact.impactLevel} | ${impact.reason} | ${impact.suggestedAction} | ${impact.owner} | ${event.riskLevel} · ${event.title.slice(0, 18)} |`,
        )
        .join("\n"),
  );

  sections.push(
    `${h()}建议动作（按优先级排序）\n\n` +
      sorted
        .slice(0, 5)
        .map((e, i) => `${i + 1}. **${e.riskLevel}** ${e.recommendedActions[0]}（${e.owner}，依据 ${e.evidenceCount} 条证据）`)
        .join("\n"),
  );

  const pending = sorted.filter((e) => e.status === "human_review" || e.confidenceLevel.hasConflict);
  sections.push(
    `${h()}待人工确认\n\n` +
      (pending.length === 0
        ? "无。"
        : pending
            .map(
              (e) =>
                `- ${e.title}：${e.confidenceLevel.hasConflict ? "存在口径冲突，" : ""}需确认${e.productImpact[0]?.module ? ` ${MODULE_LABELS[e.productImpact[0].module]} ` : ""}是否已覆盖该场景`,
            )
            .join("\n")),
  );

  sections.push(
    `${h()}证据清单（评分可审计）\n\n| 证据 | 来源 | 级别 | 分数 | 状态 | 原文 |\n| --- | --- | --- | --- | --- | --- |\n` +
      evidence
        .slice(0, 12)
        .map(
          (e) =>
            `| ${e.title.slice(0, 16)} | ${e.sourceName} | ${e.authorityLevel} | ${e.score?.total ?? "-"} | ${e.verificationStatus} | ${e.originalUrl} |`,
        )
        .join("\n"),
  );

  sections.push(
    `${h()}方法与边界\n\n` +
      `- 评分：来源权威度 25% + 可核验性 20% + 多源印证 20% + 时效性 15% + 信息密度 10%，历史先例最多 +8，冲突 −20（阈值 ${memory.semantic.thresholds.passScore}/${memory.semantic.thresholds.warningScore}）。\n` +
      `- 记忆：working（去重指纹/未结主题）、episodic（历史事件卡片 ${memory.episodic.length} 条）、semantic（源先验 ${memory.semantic.sourcePriors.length} 条、playbook ${memory.semantic.playbookRules.length} 条）。\n` +
      `- 边界：本报告可用于内部排序与验证，不可作为对外口径；政策事实必须回到 S/A 级原文。\n` +
      `- 数据说明：${run.dataOrigin === "sample" ? "本期为样本语料演示，时间相对生成，非真实抓取。" : "本期为实时采集结果。"}\n`,
  );

  const markdown =
    `# 火车票情报${type === "weekly" ? "周报" : type === "topic" ? "专题" : "日报"} · ${range}\n\n` +
    `> 生成时间 ${formatDateTime(now.toISOString())} · 数据来源 ${run.dataOrigin} · 运行 \`${run.runId}\`\n\n` +
    sections.join("\n\n");

  return {
    reportId: `rpt_${run.runId}`,
    reportType: type,
    dateRange: range,
    includedCategories: ["policy", "competitor", "sentiment"],
    summary: conclusion,
    eventIds: sorted.map((e) => e.eventId),
    evidenceIds: evidence.map((e) => e.evidenceId),
    generatedAt: now.toISOString(),
    markdown,
    dataOrigin: run.dataOrigin,
    metrics,
  };
}

function renderEvent(event: IntelligenceEvent, order: number): string {
  const opinion = event.opinion;
  return [
    `### ${order}. [${event.riskLevel}] ${event.title}`,
    ``,
    `- 类型：${EVENT_TYPE_LABELS[event.eventType]}｜置信度 ${event.confidence ?? 0}%｜${event.sourceSummary}`,
    `- 影响用户：${event.affectedUsers}；影响模块：${event.affectedModules.map((m) => MODULE_LABELS[m]).join("、")}`,
    opinion ? `- **参考意见（${opinion.stance === "act" ? "可行动" : opinion.stance === "watch" ? "先观察" : "暂缓"}）**：${opinion.headline}` : "",
    ``,
    opinion ? `**依据**\n${opinion.reasoning.map((r) => `- ${r}`).join("\n")}` : "",
    ``,
    opinion ? `**什么情况下这个判断会被推翻**\n${opinion.falsifiers.map((r) => `- ${r}`).join("\n")}` : "",
    ``,
    opinion ? `**30 分钟内可完成的验证**\n${opinion.verificationSteps.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : "",
    ``,
    opinion ? `**观察指标**：${opinion.watchMetrics.join("；")}` : "",
    ``,
    opinion ? `**使用边界**：${opinion.usageBoundary}` : "",
    ``,
    `**时间线**（${event.publishedTimeStart?.slice(0, 16)} → ${event.publishedTimeEnd?.slice(0, 16)}）`,
    ...(event.timeline ?? []).map(
      (point) =>
        `- ${point.at.slice(0, 16)} [${point.relation}] ${point.sourceName}（${point.authorityLevel}）：${point.label}`,
    ),
    event.conflicts && event.conflicts.length > 0
      ? `\n**冲突标记**：${event.conflicts.map((c) => c.note).join("；")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
