import type { EvidenceScore, EvidenceStatus, IntelligenceSource, MemorySnapshot } from "@/lib/types";
import { freshnessScore } from "./dates";
import type { Classification } from "./classify";
import type { NormalizedDocument } from "./dedupe";
import { clamp01, countNumbers, hasExplicitDate } from "./text";
import { authorityRank } from "./source-registry";

const AUTHORITY_BASE: Record<string, number> = { S: 1, A: 0.86, B: 0.64, C: 0.46, D: 0.28 };

export interface ScoreContext {
  source: IntelligenceSource;
  now: Date;
  /** how many independent sources carry the same topic key */
  corroborationCount: number;
  hasConflict: boolean;
  memory: MemorySnapshot;
  /** 0..1 extra boost when the topic shares tokens with an accepted historical event */
  precedentBoost?: number;
}

/** The explainable scorecard: 5 weighted dimensions + 1 explicit penalty. */
export function scoreEvidence(
  doc: NormalizedDocument,
  cls: Classification,
  ctx: ScoreContext,
): EvidenceScore {
  const { source, now, memory } = ctx;
  const prior = memory.semantic.sourcePriors.find((p) => p.sourceId === source.sourceId);
  const reliability = prior?.reliability ?? source.reliability ?? 0.7;

  // 1) authority: level base, official bonus, modulated by learned reliability
  const authorityBase = AUTHORITY_BASE[source.authorityLevel] ?? 0.3;
  const officialBonus = source.isOfficial ? 0.06 : 0;
  const authorityValue = clamp01(authorityBase + officialBonus) * (0.55 + 0.45 * clamp01(reliability / 0.95));

  // 2) verifiability: original url + snapshot + content hash
  const isHttp = /^https?:\/\//i.test(doc.url);
  const verifiabilityValue = clamp01(
    (isHttp ? 0.45 : 0.12) + (doc.normalizedText.length >= 80 ? 0.35 : 0.2) + 0.2,
  );

  // 3) corroboration: how many independent sources agree
  const corroborationValue = clamp01(Math.min(1, ctx.corroborationCount / 3));

  // 4) freshness
  const freshnessValue = freshnessScore(doc.publishedAt, now);

  // 5) specificity: concrete numbers / dates make a claim checkable
  const numbers = countNumbers(doc.normalizedText);
  const specificityValue = clamp01(numbers / 6 + (hasExplicitDate(doc.normalizedText) ? 0.25 : 0));

  const dimensions = [
    {
      key: "authority",
      label: "来源权威度",
      weight: 0.25,
      value: authorityValue,
      points: round(authorityValue * 0.25 * 100),
      note: `${source.authorityLevel} 级${source.isOfficial ? "官方源" : "非官方源"} · 历史采纳率 ${(reliability * 100).toFixed(0)}%`,
    },
    {
      key: "verifiability",
      label: "可核验性",
      weight: 0.2,
      value: verifiabilityValue,
      points: round(verifiabilityValue * 0.2 * 100),
      note: `${isHttp ? "有原文链接" : "仅内部引用"} · ${doc.normalizedText.length} 字快照 · 内容指纹已留存`,
    },
    {
      key: "corroboration",
      label: "多源印证",
      weight: 0.2,
      value: corroborationValue,
      points: round(corroborationValue * 0.2 * 100),
      note: `${ctx.corroborationCount} 个独立来源指向同一主题`,
    },
    {
      key: "freshness",
      label: "时效性",
      weight: 0.15,
      value: freshnessValue,
      points: round(freshnessValue * 0.15 * 100),
      note: `发布距今 ${Math.round((now.getTime() - new Date(doc.publishedAt).getTime()) / 3_600_000)} 小时`,
    },
    {
      key: "specificity",
      label: "信息密度",
      weight: 0.1,
      value: specificityValue,
      points: round(specificityValue * 0.1 * 100),
      note: `${numbers} 个可核对数字${hasExplicitDate(doc.normalizedText) ? " · 含明确日期" : ""}`,
    },
  ];

  const precedent = clamp01(ctx.precedentBoost ?? 0);
  const precedentPoints = round(precedent * 8);
  if (precedent > 0) {
    dimensions.push({
      key: "precedent",
      label: "历史先例",
      weight: 0.08,
      value: precedent,
      points: precedentPoints,
      note: `与已验证的历史事件相似度 ${(precedent * 100).toFixed(0)}%（记忆加成）`,
    });
  }

  const conflictPenalty = ctx.hasConflict ? 20 : 0;
  const raw = dimensions.reduce((sum, d) => sum + d.points, 0) - conflictPenalty;
  const total = Math.max(0, Math.min(100, Math.round(raw)));
  const { passScore, warningScore } = memory.semantic.thresholds;
  const grade: EvidenceScore["grade"] = total >= passScore ? "pass" : total >= warningScore ? "warning" : "blocked";

  return { total, grade, dimensions, conflictPenalty };
}

export function verificationStatusFor(score: EvidenceScore, doc: NormalizedDocument, hasConflict: boolean): EvidenceStatus {
  if (hasConflict) return "conflict";
  if (score.grade === "blocked") return "blocked";
  if (/^https?:\/\//i.test(doc.url)) return "verified_online";
  return "verified_snapshot";
}

/** Policy facts require a pass-grade official source with no conflict. A lead never becomes a fact. */
export function canBePolicyEvidence(score: EvidenceScore, source: IntelligenceSource, hasConflict: boolean): boolean {
  return (
    score.grade === "pass" &&
    !hasConflict &&
    source.isOfficial &&
    authorityRank(source.authorityLevel) >= 4
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
