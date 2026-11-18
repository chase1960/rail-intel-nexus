import type { EvidenceItem, IntelligenceSource, MemorySnapshot } from "@/lib/types";
import type { Classification } from "./classify";
import { evidenceIdFor, type NormalizedDocument } from "./dedupe";
import { scoreEvidence, verificationStatusFor, canBePolicyEvidence, type ScoreContext } from "./score";

export interface EngineEvidence {
  evidenceId: string;
  doc: NormalizedDocument;
  classification: Classification;
  item: EvidenceItem;
  score: ReturnType<typeof scoreEvidence>;
  duplicateOf: string | null;
}

export interface BuildEvidenceContext {
  source: IntelligenceSource;
  now: Date;
  memory: MemorySnapshot;
  corroborationCount: number;
  hasConflict: boolean;
  duplicateOf?: string | null;
  precedentBoost?: number;
}

export function buildEvidenceItem(
  doc: NormalizedDocument,
  cls: Classification,
  ctx: BuildEvidenceContext,
): EngineEvidence {
  const score = scoreEvidence(doc, cls, {
    source: ctx.source,
    now: ctx.now,
    corroborationCount: ctx.corroborationCount,
    hasConflict: ctx.hasConflict,
    memory: ctx.memory,
    precedentBoost: ctx.precedentBoost,
  } satisfies ScoreContext);

  const evidenceId = evidenceIdFor(doc);
  const item: EvidenceItem = {
    evidenceId,
    title: doc.cleanTitle || doc.title,
    sourceId: doc.sourceId,
    sourceName: ctx.source.name,
    authorityLevel: ctx.source.authorityLevel,
    isOfficial: ctx.source.isOfficial,
    publishedAt: doc.publishedAt,
    collectedAt: ctx.now.toISOString(),
    originalUrl: doc.url,
    snapshotText: doc.normalizedText,
    summary: doc.summary,
    keywords: doc.keywords,
    category: cls.category,
    verificationStatus: verificationStatusFor(score, doc, ctx.hasConflict),
    quotedByEvents: [],
    canBePolicyEvidence: canBePolicyEvidence(score, ctx.source, ctx.hasConflict),
    contentHash: doc.contentHash,
    version: ctx.duplicateOf ? 2 : 1,
    score,
    duplicateOf: ctx.duplicateOf ?? null,
    entityHints: cls.entityHints,
    conflictWith: [],
    dataOrigin: doc.dataOrigin,
    author: doc.author,
  };

  return {
    evidenceId,
    doc,
    classification: cls,
    item,
    score,
    duplicateOf: ctx.duplicateOf ?? null,
  };
}
