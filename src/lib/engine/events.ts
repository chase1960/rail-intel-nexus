import type { IntelligenceEvent, MemorySnapshot } from "@/lib/types";
import type { EngineEvidence } from "./evidence";
import { anchorOf, type EventCluster } from "./cluster";
import type { ProductImpact } from "@/lib/types";
import type { EventOpinion } from "@/lib/types";
import { hashString } from "./text";

export function eventIdFor(cluster: EventCluster): string {
  return `evt_${hashString(`${cluster.clusterKey}|${cluster.start.slice(0, 10)}`).slice(0, 8)}`;
}

export function buildEvent(
  cluster: EventCluster,
  evidence: EngineEvidence[],
  impacts: ProductImpact[],
  opinion: EventOpinion,
  memory: MemorySnapshot,
  now: Date,
): IntelligenceEvent {
  const rep = cluster.rep;
  const anchor = anchorOf(cluster);
  const title = rep.doc.cleanTitle.includes(anchor.label)
    ? rep.doc.cleanTitle
    : `${anchor.label}｜${rep.doc.cleanTitle}`;

  const distinctSources = new Set(evidence.map((e) => e.item.sourceId));
  const officialCount = evidence.filter((e) => e.item.isOfficial).length;
  const bestScore = evidence.reduce((a, b) => (a.score.total >= b.score.total ? a : b));
  const conflictIds = cluster.conflicts.flatMap((c) => [c.a.evidenceId, c.b.evidenceId]);

  const sourceSummary = [
    `${distinctSources.size} 个独立来源 / ${evidence.length} 条证据`,
    officialCount > 0 ? `官方 ${officialCount} 条` : "无官方源，按线索处理",
    cluster.conflicts.length > 0 ? `冲突 ${cluster.conflicts.length} 处` : "无冲突",
    `最高 ${bestScore.score.total} 分（${bestScore.item.sourceName}）`,
  ].join(" · ");

  const summary =
    `${anchor.label}主题在 ${cluster.start.slice(5, 10)} 至 ${cluster.end.slice(5, 10)} 形成 ${evidence.length} 条证据链。` +
    `核心信号：${rep.doc.summary}` +
    (cluster.conflicts.length > 0
      ? ` 注意：${cluster.conflicts.length} 条低权威表述与官方口径冲突，已隔离，不进入结论。`
      : "");

  const recommendedActions = impacts
    .slice(0, 3)
    .map((i) => `${i.module}：${i.suggestedAction}`);
  if (!recommendedActions.some((a) => a.includes("原文"))) {
    recommendedActions.push("补齐 S/A 级原文与生效日期，再对外使用");
  }

  const reviewDecision = memory.feedback
    .filter((f) => f.eventId === eventIdFor(cluster))
    .slice(-1)[0]?.decision;

  const status: IntelligenceEvent["status"] = reviewDecision
    ? reviewDecision === "confirm" || reviewDecision === "promote"
      ? "confirmed"
      : "invalid_lead"
    : cluster.conflicts.length > 0
      ? "human_review"
      : cluster.riskLevel === "P3"
        ? "watching"
        : "human_review";

  const eventId = eventIdFor(cluster);

  return {
    eventId,
    title,
    eventType: cluster.eventType,
    summary,
    relatedEvidenceIds: evidence.map((e) => e.evidenceId),
    affectedUsers: anchor.users,
    affectedModules: Array.from(
      new Set([...anchor.modules, ...impacts.map((i) => i.module)]),
    ).slice(0, 8),
    sentiment: cluster.sentiment,
    riskLevel: cluster.riskLevel,
    confidenceLevel: {
      hasOfficialSource: officialCount > 0,
      multiSourceCorroborated: distinctSources.size >= 2,
      hasOriginalUrl: evidence.some((e) => /^https?:\/\//i.test(e.doc.url)),
      hasSnapshot: evidence.every((e) => e.doc.normalizedText.length > 40),
      hasConflict: cluster.conflicts.length > 0,
      humanReviewed: !!reviewDecision,
    },
    sourceSummary,
    productImpact: impacts,
    recommendedActions,
    owner: impacts[0]?.owner ?? "未分配",
    status,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    clusterKey: cluster.clusterKey,
    confidence: Math.round(cluster.confidence * 100),
    opinion,
    timeline: cluster.timeline,
    publishedTimeStart: cluster.start,
    publishedTimeEnd: cluster.end,
    conflicts: conflictIds.length
      ? cluster.conflicts.map((c) => ({
          evidenceId: c.b.evidenceId,
          note: c.note,
        }))
      : [],
    dataOrigin: evidence[0]?.item.dataOrigin ?? "sample",
    evidenceCount: evidence.length,
    distinctSourceCount: distinctSources.size,
    precedentEventIds: memory.episodic
      .filter((e) => e.clusterKey === cluster.clusterKey)
      .slice(0, 3)
      .map((e) => e.eventId),
    reviewNote: "",
  };
}
