import type { RawDocument } from "./sample-corpus";
import { cleanTitle, hashString, keywordSet, normalizeText, similarity, extractiveSummary } from "./text";

export interface NormalizedDocument extends RawDocument {
  cleanTitle: string;
  normalizedText: string;
  contentHash: string;
  keywords: string[];
  summary: string;
}

export interface DuplicateRecord {
  doc: NormalizedDocument;
  duplicateOf: string;
  reason: "exact_hash" | "near_duplicate" | "already_ingested";
  similarity: number;
}

export interface DedupeResult {
  canonical: NormalizedDocument[];
  duplicates: DuplicateRecord[];
  /** Docs already seen in an earlier run: reused for aggregation, but count as 0 new evidence. */
  reused: NormalizedDocument[];
}

export function normalizeDocuments(docs: RawDocument[]): NormalizedDocument[] {
  return docs.map((doc) => {
    const clean = cleanTitle(doc.title);
    const normalizedText = normalizeText(doc.text);
    return {
      ...doc,
      title: normalizeText(doc.title),
      cleanTitle: clean,
      normalizedText,
      contentHash: hashString(`${clean}\n${normalizedText}`),
      keywords: keywordSet(`${clean} ${normalizedText}`, 24),
      summary: extractiveSummary(normalizedText, 120),
    };
  });
}

/**
 * Two-layer dedupe:
 *  1. exact content hash (same press release republished byte-for-byte)
 *  2. near-duplicate similarity (syndicated copy with a new title, or re-edited post)
 * Canonical = the earliest published version; later copies become "versions" of it.
 */
export function dedupeDocuments(
  docs: NormalizedDocument[],
  opts: { nearThreshold?: number; seenHashes?: string[] } = {},
): DedupeResult {
  const nearThreshold = opts.nearThreshold ?? 0.82;
  const seenHashes = new Set(opts.seenHashes ?? []);
  const byHash = new Map<string, NormalizedDocument>();
  const canonical: NormalizedDocument[] = [];
  const duplicates: DuplicateRecord[] = [];
  const reused: NormalizedDocument[] = [];

  const sorted = [...docs].sort(
    (a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime(),
  );

  for (const doc of sorted) {
    if (seenHashes.has(doc.contentHash)) {
      // Already ingested in an earlier run. Keep it downstream (so the dashboard
      // does not go blank on a second run) but it contributes 0 "new" evidence.
      duplicates.push({ doc, duplicateOf: doc.contentHash, reason: "already_ingested", similarity: 1 });
      reused.push(doc);
      byHash.set(doc.contentHash, doc);
      canonical.push(doc);
      continue;
    }
    const exact = byHash.get(doc.contentHash);
    if (exact) {
      duplicates.push({ doc, duplicateOf: exact.docId, reason: "exact_hash", similarity: 1 });
      continue;
    }

    let matched: { doc: NormalizedDocument; score: number } | null = null;
    for (const candidate of canonical) {
      if (candidate.sourceId === doc.sourceId && candidate.cleanTitle === doc.cleanTitle) continue;
      const score = similarity(
        `${candidate.cleanTitle} ${candidate.normalizedText}`,
        `${doc.cleanTitle} ${doc.normalizedText}`,
      );
      if (score >= nearThreshold && (!matched || score > matched.score)) {
        matched = { doc: candidate, score };
      }
    }

    if (matched) {
      duplicates.push({
        doc,
        duplicateOf: matched.doc.docId,
        reason: "near_duplicate",
        similarity: Number(matched.score.toFixed(3)),
      });
      continue;
    }

    byHash.set(doc.contentHash, doc);
    canonical.push(doc);
  }

  return { canonical, duplicates, reused };
}

/** Stable evidence id derived from content — re-running the same corpus never creates duplicates. */
export function evidenceIdFor(doc: NormalizedDocument): string {
  return `ev_${doc.contentHash.slice(0, 10)}`;
}
