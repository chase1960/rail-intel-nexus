import type {
  FeedbackRecord,
  IntelligenceEvent,
  KeywordWeight,
  MemorySnapshot,
  PlaybookRule,
  SourcePrior,
} from "@/lib/types";
import { SOURCES } from "./source-registry";
import { nowIso } from "./dates";

const SEED_RULES: Omit<PlaybookRule, "createdAt" | "lastUsedAt" | "hits">[] = [
  {
    ruleId: "seed-official-triangulation",
    rule: "S 级官方原文 + ≥3 个独立来源指向同一主题时，可直接进入产品评估，不必等第二封公告。",
    domain: "cross",
    support: 0,
    confidence: 0.9,
    source: "seed",
  },
  {
    ruleId: "seed-refund-baseline",
    rule: "涉及退款/扣款/冻结的反馈，即使没有官方源，也按 P2 起评，不允许降为 P3 观察。",
    domain: "sentiment",
    support: 0,
    confidence: 0.85,
    source: "seed",
  },
  {
    ruleId: "seed-competitor-delay",
    rule: "竞品功能上线 7 天内若无用户侧抱怨，只作为对标信息，不立项。",
    domain: "competitor",
    support: 0,
    confidence: 0.7,
    source: "seed",
  },
  {
    ruleId: "seed-conflict-hold",
    rule: "低权威源与官方源给出不同数字时，一律标记冲突，不写进报告结论。",
    domain: "policy",
    support: 0,
    confidence: 0.95,
    source: "seed",
  },
  {
    ruleId: "seed-service-first",
    rule: "学生票/儿童票类规则变化，先同步客服口径再改前端页面，避免工单二次爆发。",
    domain: "policy",
    support: 0,
    confidence: 0.8,
    source: "seed",
  },
];

export function createMemory(now = new Date()): MemorySnapshot {
  const iso = now.toISOString();
  const sourcePriors: SourcePrior[] = SOURCES.map((source) => ({
    sourceId: source.sourceId,
    reliability: source.reliability ?? 0.7,
    accepted: 0,
    rejected: 0,
    samples: 0,
    updatedAt: iso,
  }));

  return {
    version: 1,
    createdAt: iso,
    updatedAt: iso,
    working: {
      lastRunId: null,
      seenHashes: [],
      openClusterKeys: [],
      notes: [
        "记忆分三层：working（本次运行上下文）/ episodic（历史事件卡片）/ semantic（学习到的规则与权重）。",
      ],
      updatedAt: iso,
    },
    episodic: [],
    semantic: {
      sourcePriors,
      keywordWeights: [],
      playbookRules: SEED_RULES.map((rule) => ({
        ...rule,
        createdAt: iso,
        lastUsedAt: iso,
        hits: 0,
      })),
      thresholds: { passScore: 75, warningScore: 55, clusterSimilarity: 0.3 },
    },
    feedback: [],
  };
}

/** Beta-smoothed reliability: prior weight 6 observations, then learned confirmations/rejections. */
function betaReliability(base: number, accepted: number, rejected: number): number {
  const alpha = 6 * base;
  const beta = 6 * (1 - base);
  return clamp((alpha + accepted) / (alpha + beta + accepted + rejected), 0.05, 0.99);
}

export interface FeedbackInput {
  event: IntelligenceEvent;
  decision: FeedbackRecord["decision"];
  reason: string;
  actor: string;
  sourceIds: string[];
  scoreBefore?: number;
  now?: Date;
}

/**
 * Closed loop: a human decision changes (a) source priors, (b) keyword weights,
 * (c) playbook rules. The next pipeline run scores and clusters differently —
 * that is the "self-evolution" mechanism, with humans kept in the loop.
 */
export function applyFeedback(memory: MemorySnapshot, input: FeedbackInput): MemorySnapshot {
  const now = input.now ?? new Date();
  const iso = now.toISOString();

  const sourcePriors = memory.semantic.sourcePriors.map((prior) => {
    if (!input.sourceIds.includes(prior.sourceId)) return prior;
    const accepted = prior.accepted + (input.decision === "confirm" || input.decision === "promote" ? 1 : 0);
    const rejected = prior.rejected + (input.decision === "reject" || input.decision === "demote" ? 1 : 0);
    const baseReliability = prior.reliability;
    return {
      ...prior,
      accepted,
      rejected,
      samples: accepted + rejected,
      reliability: betaReliability(baseReliability, accepted, rejected),
      updatedAt: iso,
    } satisfies SourcePrior;
  });

  const positive = input.decision === "confirm" || input.decision === "promote";
  const tokens = input.event.clusterKey ? input.event.clusterKey.split("·") : [];
  const keywordMap = new Map<string, KeywordWeight>(
    memory.semantic.keywordWeights.map((k) => [k.token, k]),
  );
  for (const token of tokens) {
    if (!token) continue;
    const existing = keywordMap.get(token);
    const weight = clamp((existing?.weight ?? 0.5) + (positive ? 0.12 : -0.12), 0.1, 1);
    keywordMap.set(token, {
      token,
      weight,
      hits: (existing?.hits ?? 0) + 1,
      updatedAt: iso,
    });
  }

  const feedback: FeedbackRecord = {
    feedbackId: `fb_${now.getTime().toString(36)}_${input.event.eventId.slice(0, 6)}`,
    eventId: input.event.eventId,
    decision: input.decision,
    reason: input.reason,
    actor: input.actor,
    at: iso,
    scoreBefore: input.scoreBefore,
  };

  // learned playbook rule: two confirmations on the same topic produce a reusable rule
  const confirmations = [...memory.feedback, feedback].filter(
    (f) => f.decision === "confirm" && f.eventId === input.event.eventId,
  ).length;
  let playbookRules = memory.semantic.playbookRules;
  if (positive && confirmations >= 2) {
    const ruleId = `learned-${input.event.clusterKey ?? input.event.eventId}`;
    if (!playbookRules.some((r) => r.ruleId === ruleId)) {
      playbookRules = [
        ...playbookRules,
        {
          ruleId,
          rule: `「${input.event.title}」同类信号已被人工确认 ${confirmations} 次，后续出现同主题事件默认进入产品评估。`,
          domain: "cross",
          support: confirmations,
          confidence: 0.75,
          createdAt: iso,
          lastUsedAt: iso,
          hits: 0,
          source: "learned",
        },
      ];
    }
  }

  const episodic: MemorySnapshot["episodic"] = memory.episodic.map(
    (e): MemorySnapshot["episodic"][number] =>
      e.eventId === input.event.eventId
        ? { ...e, decision: positive ? "confirm" : "reject" }
        : e,
  );

  return {
    ...memory,
    version: memory.version + 1,
    updatedAt: iso,
    semantic: { ...memory.semantic, sourcePriors, keywordWeights: [...keywordMap.values()], playbookRules },
    episodic,
    feedback: [...memory.feedback, feedback],
  };
}

export function recordRun(
  memory: MemorySnapshot,
  runId: string,
  events: IntelligenceEvent[],
  seenHashes: string[],
  now = new Date(),
): MemorySnapshot {
  const iso = now.toISOString();
  const existing = new Map(memory.episodic.map((e) => [e.eventId, e]));
  const cards: MemorySnapshot["episodic"] = events.map((event) => {
    const prev = existing.get(event.eventId);
    return {
      eventId: event.eventId,
      title: event.title,
      clusterKey: event.clusterKey ?? "",
      riskLevel: event.riskLevel,
      decision: prev?.decision ?? "pending",
      at: iso,
    };
  });

  return {
    ...memory,
    updatedAt: iso,
    working: {
      lastRunId: runId,
      seenHashes: Array.from(new Set([...memory.working.seenHashes, ...seenHashes])).slice(-500),
      openClusterKeys: events.filter((e) => e.riskLevel !== "P3").map((e) => e.clusterKey ?? "").filter(Boolean),
      notes: memory.working.notes.slice(-12),
      updatedAt: iso,
    },
    episodic: [...cards, ...memory.episodic.filter((e) => !cards.some((c) => c.eventId === e.eventId))].slice(0, 40),
  };
}

export function markRuleUsed(memory: MemorySnapshot, ruleId: string): MemorySnapshot {
  return {
    ...memory,
    semantic: {
      ...memory.semantic,
      playbookRules: memory.semantic.playbookRules.map((rule) =>
        rule.ruleId === ruleId ? { ...rule, hits: rule.hits + 1, lastUsedAt: nowIso() } : rule,
      ),
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
