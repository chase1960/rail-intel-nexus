import type {
  EventType,
  IntelligenceEvent,
  MemorySnapshot,
  ProductModule,
  RiskLevel,
  Sentiment,
  TimelinePoint,
} from "@/lib/types";
import type { EngineEvidence } from "./evidence";
import { SOURCE_BY_ID } from "./source-registry";
import { formatDate, hoursBetween } from "./dates";

interface Anchor {
  key: string;
  label: string;
  keywords: string[];
  modules: ProductModule[];
  users: string;
}

/** Topic anchors make cross-source clustering predictable instead of "everything merges". */
const ANCHORS: Anchor[] = [
  {
    key: "student",
    label: "学生票",
    keywords: ["学生票", "学生", "开学季", "资质核验"],
    modules: ["student_zone", "form", "search"],
    users: "学生旅客（约 2200 万活跃）",
  },
  {
    key: "child",
    label: "儿童票",
    keywords: ["儿童票", "儿童", "身高", "带娃"],
    modules: ["child_zone", "price", "form"],
    users: "带娃出行家庭用户",
  },
  {
    key: "waiting",
    label: "候补购票",
    keywords: ["候补", "排队", "抢票"],
    modules: ["list", "order", "aftersale"],
    users: "候补购票用户",
  },
  {
    key: "refund",
    label: "退改签",
    keywords: ["退票", "改签", "退改签", "手续费", "退款"],
    modules: ["aftersale", "price", "form"],
    users: "所有退改签用户",
  },
  {
    key: "invoice",
    label: "电子发票",
    keywords: ["发票", "开票", "报销"],
    modules: ["order", "aftersale"],
    users: "报销 / 差旅用户",
  },
  {
    key: "stability",
    label: "支付稳定性",
    keywords: ["闪退", "崩溃", "支付失败", "机型"],
    modules: ["payment"],
    users: "安卓端支付用户",
  },
  {
    key: "intl",
    label: "国际火车票",
    keywords: ["国际", "跨境", "境外"],
    modules: ["intl"],
    users: "国际出行用户",
  },
  {
    key: "ops",
    label: "运营公告",
    keywords: ["停运", "晚点", "恢复", "检修"],
    modules: ["list", "service"],
    users: "受影响线路旅客",
  },
];

const EVENT_TYPE_PRIORITY: EventType[] = [
  "policy_change",
  "regulatory_risk",
  "competitor_feature",
  "complaint_spike",
  "sentiment_hot",
  "product_opportunity",
];

export interface DetectedConflict {
  a: EngineEvidence;
  b: EngineEvidence;
  note: string;
}

export interface EventCluster {
  clusterKey: string;
  anchor: Anchor;
  evidence: EngineEvidence[];
  conflicts: DetectedConflict[];
  timeline: TimelinePoint[];
  start: string;
  end: string;
  rep: EngineEvidence;
  riskLevel: RiskLevel;
  eventType: EventType;
  sentiment: Sentiment;
  distinctSources: number;
  confidence: number;
}

export function pickAnchor(text: string): Anchor {
  let best = ANCHORS[ANCHORS.length - 1];
  let bestCount = 0;
  for (const anchor of ANCHORS) {
    const hits = anchor.keywords.reduce(
      (sum, keyword) => (text.includes(keyword) ? sum + 1 : sum),
      0,
    );
    if (hits > bestCount) {
      best = anchor;
      bestCount = hits;
    }
  }
  return best;
}

/** Which information category an event type belongs to (drives representative evidence). */
function categoryOfType(type: EventType): "policy" | "competitor" | "sentiment" {
  if (type === "policy_change" || type === "regulatory_risk") return "policy";
  if (type === "competitor_feature") return "competitor";
  return "sentiment";
}

function dominantType(items: EngineEvidence[]): EventType {
  // Vote on the *information category* first (policy / competitor / sentiment),
  // because fine-grained event types split the sentiment camp into
  // sentiment_hot + complaint_spike and let a single official competitor post win.
  // Official sources carry double weight; category ties break by EVENT_TYPE_PRIORITY order.
  const votes: Record<"policy" | "competitor" | "sentiment", number> = { policy: 0, competitor: 0, sentiment: 0 };
  for (const item of items) {
    votes[item.classification.category] += item.item.isOfficial ? 2 : 1;
  }
  const order: Array<"policy" | "competitor" | "sentiment"> = ["policy", "competitor", "sentiment"];
  let winner = order[0];
  for (const category of order) if (votes[category] > votes[winner]) winner = category;

  if (winner === "policy") {
    const riskHeavy = items.filter(
      (i) => i.classification.category === "policy" && i.classification.riskSignals.length > 0,
    ).length;
    return riskHeavy * 2 > items.length ? "regulatory_risk" : "policy_change";
  }
  if (winner === "competitor") {
    const officialCompetitor = items.some((i) => i.classification.category === "competitor" && i.item.isOfficial);
    return officialCompetitor && items.length === 1 ? "product_opportunity" : "competitor_feature";
  }
  const complaints = items.filter(
    (i) =>
      i.classification.category === "sentiment" &&
      (SOURCE_BY_ID.get(i.item.sourceId)?.sourceType ?? "").includes("complaint"),
  ).length;
  return complaints * 2 > votes.sentiment ? "complaint_spike" : "sentiment_hot";
}

function aggregateSentiment(items: EngineEvidence[]): Sentiment {
  const counts: Record<Sentiment, number> = { negative: 0, neutral: 0, positive: 0, mixed: 0 };
  for (const item of items) counts[item.classification.sentiment]++;
  if (counts.negative === 0 && counts.positive === 0) return "neutral";
  if (counts.negative > 0 && counts.positive > 0) return "mixed";
  return counts.negative >= counts.positive ? "negative" : "positive";
}

const CONFLICT_MARKERS = ["未证实", "不一致", "与官方", "辟谣", "未在", "存疑", "未经确认"];

/** Rule-based conflict detection — a numeric claim beat by a weaker source, or an explicit contradiction. */
export function detectConflicts(items: EngineEvidence[]): DetectedConflict[] {
  const conflicts: DetectedConflict[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.item.authorityLevel === b.item.authorityLevel) continue;

      const weaker = a.item.authorityLevel > b.item.authorityLevel ? a : b;
      const stronger = weaker === a ? b : a;
      const gap = ["S", "A", "B", "C", "D"].indexOf(stronger.item.authorityLevel) -
        ["S", "A", "B", "C", "D"].indexOf(weaker.item.authorityLevel);

      const text = `${weaker.doc.cleanTitle} ${weaker.doc.normalizedText}`;
      const marker = CONFLICT_MARKERS.some((m) => text.includes(m));
      const weakerDays = weaker.classification.numericClaims.filter((c) => c.includes("天"));
      const strongerDays = stronger.classification.numericClaims.filter((c) => c.includes("天"));
      const numericMismatch =
        weakerDays.length > 0 &&
        strongerDays.length > 0 &&
        weakerDays.every((claim) => !strongerDays.includes(claim));

      if (gap >= 2 && (marker || numericMismatch)) {
        conflicts.push({
          a: stronger,
          b: weaker,
          note: marker
            ? `${weaker.item.sourceName}的表述与${stronger.item.sourceName}口径不一致（${weaker.item.authorityLevel} 级 vs ${stronger.item.authorityLevel} 级）`
            : `数字口径冲突：${weakerDays.join("/")} vs ${strongerDays.join("/")}`,
        });
      }
    }
  }
  return conflicts;
}

function confidenceOf(items: EngineEvidence[]): number {
  if (items.length === 0) return 0;
  const scored = items.map((i) => i.score.total);
  const avg = scored.reduce((a, b) => a + b, 0) / scored.length;
  const best = Math.max(...scored);
  const breadth = Math.min(1, new Set(items.map((i) => i.item.sourceId)).size / 4);
  const official = items.some((i) => i.item.isOfficial) ? 0.12 : 0;
  return Math.max(0, Math.min(1, 0.35 * (avg / 100) + 0.35 * (best / 100) + 0.18 * breadth + official));
}

function riskOf(cluster: Omit<EventCluster, "riskLevel">): RiskLevel {
  const { evidence, eventType, confidence, conflicts, distinctSources } = cluster;
  const anyHigh = evidence.some((e) => e.classification.riskSignals.includes("涉及资金，投诉升级风险高"));
  const policyish = eventType === "policy_change" || eventType === "regulatory_risk";
  if (confidence >= 0.78 && (policyish || distinctSources >= 3)) return "P1";
  if (anyHigh && evidence.length >= 3) return "P1";
  if (conflicts.length > 0 && policyish) return "P1";
  if (confidence >= 0.6 || evidence.length >= 2) return "P2";
  return "P3";
}

export function buildClusters(evidence: EngineEvidence[], memory: MemorySnapshot): EventCluster[] {
  // Cluster on the topic anchor (keeps cross-source corroboration and the shared
  // timeline), but the event *type* comes from a category vote and the representative
  // evidence is taken from that winning category — otherwise a competitor release
  // could sit under a "policy change" label.
  const groups = new Map<string, EngineEvidence[]>();
  for (const item of evidence) {
    if (item.score.grade === "blocked") continue;
    const anchor = pickAnchor(`${item.doc.cleanTitle} ${item.doc.normalizedText}`);
    const bucket = groups.get(anchor.key) ?? [];
    bucket.push(item);
    groups.set(anchor.key, bucket);
  }

  const clusters: EventCluster[] = [];
  for (const [clusterKey, items] of groups) {
    const anchor = pickAnchor(
      items.map((i) => `${i.doc.cleanTitle} ${i.doc.normalizedText}`).join(" "),
    );
    const sorted = [...items].sort(
      (a, b) =>
        b.score.total - a.score.total ||
        new Date(a.doc.publishedAt).getTime() - new Date(b.doc.publishedAt).getTime(),
    );
    const eventType = dominantType(items);
    const repCategory = categoryOfType(eventType);
    const rep = sorted.find((i) => i.classification.category === repCategory) ?? sorted[0];
    const conflicts = detectConflicts(items);
    const sentiment = aggregateSentiment(items);
    const start = items.reduce(
      (min, i) => (new Date(i.doc.publishedAt) < new Date(min) ? i.doc.publishedAt : min),
      items[0].doc.publishedAt,
    );
    const end = items.reduce(
      (max, i) => (new Date(i.doc.publishedAt) > new Date(max) ? i.doc.publishedAt : max),
      items[0].doc.publishedAt,
    );
    const distinctSources = new Set(items.map((i) => i.item.sourceId)).size;

    const timeline: TimelinePoint[] = [...items]
      .sort((a, b) => new Date(a.doc.publishedAt).getTime() - new Date(b.doc.publishedAt).getTime())
      .map((item) => {
        const isConflict = conflicts.some((c) => c.a === item || c.b === item);
        const relation: TimelinePoint["relation"] = isConflict
          ? "conflict"
          : item === rep
            ? "trigger"
            : new Date(item.doc.publishedAt) < new Date(rep.doc.publishedAt)
              ? "before"
              : "after";
        return {
          at: item.doc.publishedAt,
          label: item.doc.cleanTitle,
          evidenceId: item.evidenceId,
          sourceName: item.item.sourceName,
          authorityLevel: item.item.authorityLevel,
          relation,
          note: `${item.score.total} 分 · ${item.item.authorityLevel} 级${item.item.isOfficial ? " · 官方" : ""}`,
        };
      });

    const base = {
      clusterKey,
      anchor,
      evidence: items,
      conflicts,
      timeline,
      start,
      end,
      rep,
      eventType,
      sentiment,
      distinctSources,
      confidence: confidenceOf(items),
    };
    clusters.push({ ...base, riskLevel: riskOf(base) });
  }

  // episodic memory: link to precedents with the same cluster key
  for (const cluster of clusters) {
    const precedent = memory.episodic
      .filter((e) => e.clusterKey === cluster.clusterKey)
      .slice(0, 3)
      .map((e) => e.eventId);
    (cluster as EventCluster & { precedentEventIds?: string[] }).precedentEventIds = precedent;
  }

  return clusters.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
}

export function clusterWindowText(cluster: EventCluster): string {
  const hours = Math.round(hoursBetween(cluster.start, cluster.end));
  return `${formatDate(cluster.start)} → ${formatDate(cluster.end)}（${hours} 小时窗口）`;
}

export function anchorOf(cluster: EventCluster): Anchor {
  return cluster.anchor;
}

export type { Anchor };
export { ANCHORS };
