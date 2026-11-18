/**
 * Deterministic text utilities for the intelligence pipeline.
 * No randomness, no network, no locale tricks — every function is pure so that
 * the same corpus always produces the same evidence/event ids (idempotent runs).
 */

const ZERO_WIDTH = /[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g;

const STOPWORDS = new Set([
  "的",
  "了",
  "和",
  "与",
  "及",
  "或",
  "在",
  "是",
  "有",
  "为",
  "对",
  "将",
  "被",
  "把",
  "从",
  "到",
  "并",
  "也",
  "都",
  "就",
  "而",
  "但",
  "等",
  "该",
  "其",
  "本",
  "这",
  "那",
  "我们",
  "你们",
  "他们",
  "目前",
  "进行",
  "相关",
  "关于",
  "如下",
  "上述",
  "以及",
  "可以",
  "一个",
  "没有",
  "已经",
  "通过",
  "表示",
  "以上",
  "以下",
  "根据",
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "are",
  "was",
  "were",
  "will",
  "have",
  "has",
  "not",
]);

/** Strip HTML tags, scripts, styles and comments. Never executes anything. */
export function stripHtml(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/g, " ");
}

export function normalizeText(input: string): string {
  return input
    .replace(ZERO_WIDTH, "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\u3000]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** FNV-1a 64-bit (BigInt) — stable across runtimes, cheap, collision-resistant enough for dedupe. */
export function hashString(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

export function isCjk(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return code >= 0x4e00 && code <= 0x9fff;
}

/** CJK bigrams + latin words. Good enough for short Chinese intel documents. */
export function tokenize(text: string): string[] {
  const cleaned = normalizeText(text).toLowerCase();
  const tokens: string[] = [];
  const latin = cleaned.match(/[a-z][a-z0-9_.-]{1,}/g) ?? [];
  for (const word of latin) {
    if (!STOPWORDS.has(word) && word.length >= 2) tokens.push(word);
  }
  const cjkRuns = cleaned.match(/[\u4e00-\u9fff]+/g) ?? [];
  for (const run of cjkRuns) {
    if (run.length === 1) {
      if (!STOPWORDS.has(run)) tokens.push(run);
      continue;
    }
    for (let i = 0; i < run.length - 1; i++) {
      const bigram = run.slice(i, i + 2);
      if (!STOPWORDS.has(bigram)) tokens.push(bigram);
    }
  }
  return tokens;
}

export function keywordSet(text: string, limit = 30): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let inter = 0;
  for (const item of setA) if (setB.has(item)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Character n-grams, used to catch copy-paste edits that shuffle words. */
export function shingles(text: string, size = 3): Set<string> {
  const cleaned = normalizeText(text).replace(/\s+/g, "");
  const out = new Set<string>();
  for (let i = 0; i + size <= cleaned.length; i++) out.add(cleaned.slice(i, i + size));
  return out;
}

export function similarity(a: string, b: string): number {
  const tokenScore = jaccard(keywordSet(a, 60), keywordSet(b, 60));
  const shingleScore = jaccard(shingles(a), shingles(b));
  return 0.6 * tokenScore + 0.4 * shingleScore;
}

/** Remove boilerplate that inflates similarity: site names, brackets, page suffixes. */
export function cleanTitle(title: string): string {
  return normalizeText(title)
    .replace(/【[^】]*】/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[-_|｜—]\s*(12306|国铁集团|中国铁路|携程|去哪儿|飞猪)?\s*(官网|公告|新闻)?$/g, "")
    .replace(/\s*[-_|｜—]\s*第?\s*\d+\s*页$/g, "")
    .replace(/^\d{4}年?\d{1,2}月?\d{1,2}日[:：]?\s*/g, "")
    .replace(/^关于/, "")
    .trim();
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function truncate(input: string, max: number): string {
  const text = normalizeText(input);
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Summarize a document into 1-2 sentences without an LLM (extractive). */
export function extractiveSummary(text: string, max = 110): string {
  const sentences = normalizeText(text)
    .split(/(?<=[。！？；;!?])/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 6);
  const first = sentences.slice(0, 2).join("");
  return truncate(first || text, max);
}

export function countNumbers(text: string): number {
  const matches = normalizeText(text).match(/\d+(?:\.\d+)?(?:%|天|小时|单|条|万|亿|元|次|日|月)?/g);
  return matches ? matches.length : 0;
}

export function hasExplicitDate(text: string): boolean {
  return /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2})|(\d{1,2}月\d{1,2}日)|(\d{1,2}:\d{2})/.test(text);
}
