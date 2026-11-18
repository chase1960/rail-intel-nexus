import type { EventOpinion, MemorySnapshot, ProductImpact } from "@/lib/types";
import { MODULE_LABELS } from "@/lib/types";
import type { EventCluster } from "./cluster";
import { formatDate, hoursBetween } from "./dates";

/**
 * The deliverable is a *reference opinion*, not a verdict:
 *  - states its stance (act / watch / hold)
 *  - shows the evidence structure it is based on
 *  - says what would prove it wrong (falsifiers)
 *  - says how a human can verify it in < 30 minutes
 *  - states where it may NOT be used
 */
export function buildOpinion(
  cluster: EventCluster,
  impacts: ProductImpact[],
  memory: MemorySnapshot,
): EventOpinion {
  const confidencePct = Math.round(cluster.confidence * 100);
  const officialCount = cluster.evidence.filter((e) => e.item.isOfficial).length;
  const best = cluster.rep;
  const bestOverall = cluster.evidence.reduce((a, b) => (a.score.total >= b.score.total ? a : b));
  const highImpacts = impacts.filter((i) => i.impactLevel === "high");
  const topImpact = highImpacts[0] ?? impacts[0];
  const precedents = memory.episodic.filter((e) => e.clusterKey === cluster.clusterKey).length;

  const hasConflict = cluster.conflicts.length > 0;
  const officialMissing = officialCount === 0;

  let stance: EventOpinion["stance"] = "act";
  if (hasConflict || officialMissing || cluster.confidence < 0.62) stance = "watch";
  if (hasConflict && cluster.confidence < 0.5) stance = "hold";

  const headline =
    stance === "act"
      ? `建议本周内启动：${cluster.anchor.label}「${topImpact?.suggestedAction ?? "补齐规则说明"}」（置信度 ${confidencePct}%）`
      : stance === "watch"
        ? `建议观察 48 小时再决策：${cluster.anchor.label}证据尚不完整，先做低成本验证`
        : `暂不动作：${cluster.anchor.label}存在口径冲突，等官方确认后再投入`;

  const reasoning = [
    `证据结构：${cluster.evidence.length} 条有效证据，来自 ${cluster.distinctSources} 个独立来源，其中官方源 ${officialCount} 条；代表证据 ${best.score.total} 分（${best.item.sourceName}），簇内最高 ${bestOverall.score.total} 分（${bestOverall.item.sourceName}）`,
    `时间跨度：${formatDate(cluster.start)} → ${formatDate(cluster.end)}，共 ${Math.round(hoursBetween(cluster.start, cluster.end))} 小时，${cluster.eventType === "policy_change" ? "政策先发、反馈后至" : "舆情先起、官方回应待补"}`,
    topImpact
      ? `产品落点：${MODULE_LABELS[topImpact.module]} ${topImpact.impactLevel} 级影响，原因是「${topImpact.reason}」`
      : "产品落点：暂未命中已知影响规则，需人工判断",
    highImpacts.length > 0
      ? `影响面：${highImpacts.map((i) => MODULE_LABELS[i.module]).join("、")} 属于高影响，其余为可选项`
      : "影响面：仅涉及体验优化，不影响交易主链路",
    precedents > 0
      ? `历史先例：记忆中有 ${precedents} 个同类事件，本次判断已参考其处理结论`
      : "历史先例：无同类事件，本次为首见，建议更谨慎地小范围验证",
    hasConflict
      ? `反证：检测到 ${cluster.conflicts.length} 条与高权威源冲突的表述，已标记为 conflict，不得作为政策事实`
      : "反证：未检测到与高权威源冲突的表述",
  ];

  const falsifiers = [
    officialMissing
      ? "若 24 小时内仍无 S/A 级官方原文，则本意见降级为线索，不得进入产品排期"
      : "若官方原文的生效日期或适用范围与本文推断不一致，则撤回本意见并重新评分",
    "若对应模块的客服工单量在 3 日内回落 50% 以上，说明用户困惑已被现有能力吸收，优先级降为 P3",
    topImpact
      ? `若 ${MODULE_LABELS[topImpact.module]} 模块负责人确认现有实现已覆盖该场景，则取消该动作`
      : "若产品现状与推断不符，则本条影响判断作废",
    hasConflict ? "若低权威来源被官方澄清或删除，冲突标记解除，事件可升级为 confirmed" : "",
  ].filter(Boolean);

  const verificationSteps = [
    `打开代表证据原文核对关键数字与生效日期（${best.item.sourceName}）`,
    `对照 ${cluster.evidence.length} 条证据的时间线，确认「先发生什么、后发生什么」，避免因果倒置`,
    "抽查 5 条内部工单/评论原文，确认不是同一用户重复反馈",
    "与对应模块负责人过一遍现状，确认是「没做」还是「做了但没被看见」",
  ];

  const watchMetrics = [
    `相关客服工单量（当前基线参考 ${cluster.evidence.length} 条样本）`,
    "App Store / 应用宝相关关键词评论数与评分",
    "话题讨论量与情绪占比（负面/中性）",
    "竞品版本号与规则说明页面变更",
  ];

  return {
    headline,
    stance,
    reasoning,
    confidence: confidencePct,
    falsifiers,
    verificationSteps,
    watchMetrics,
    usageBoundary:
      "本意见可用于内部排序、立项讨论与验证方向，不可直接作为对外口径或监管沟通材料；对外表述必须以 S/A 级原文为准。",
  };
}
