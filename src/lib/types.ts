// Domain model for the Train Ticket Intelligence Hub.
// v2: aligned with supabase/public enums (12 workflow states, 8 verification states),
// extended with explainable scoring, evidence timeline, reference-opinion and memory types.

export type AuthorityLevel = "S" | "A" | "B" | "C" | "D";
export type IntelCategory = "policy" | "competitor" | "sentiment";
export type RiskLevel = "P1" | "P2" | "P3";
export type Sentiment = "negative" | "neutral" | "positive" | "mixed";
export type DataOrigin = "sample" | "real";

/** Workflow states, mirroring supabase enum `workflow_status`. */
export type EventStatus =
  | "new"
  | "evidence_check"
  | "human_review"
  | "confirmed"
  | "product_review"
  | "action_planned"
  | "assigned"
  | "in_progress"
  | "effect_review"
  | "closed"
  | "watching"
  | "invalid_lead";

export type EventType =
  | "policy_change"
  | "competitor_feature"
  | "sentiment_hot"
  | "complaint_spike"
  | "regulatory_risk"
  | "product_opportunity";

/** Evidence verification states, mirroring supabase enum `verification_status`. */
export type EvidenceStatus =
  | "unverified"
  | "verifying"
  | "verified_online"
  | "verified_snapshot"
  | "lead_only"
  | "conflict"
  | "blocked"
  | "obsolete";

export type CollectionStatus = "success" | "failed" | "running" | "partial" | "blocked";
export type ImpactLevel = "none" | "possible" | "clear" | "high";

export type ProductModule =
  | "search"
  | "list"
  | "price"
  | "form"
  | "payment"
  | "order"
  | "aftersale"
  | "service"
  | "student_zone"
  | "child_zone"
  | "membership"
  | "intl";

/** Access modes, mirroring supabase enum `access_mode`. */
export type AccessMode =
  | "public_web"
  | "public_api"
  | "oauth_api"
  | "login_manual"
  | "internal_connector"
  | "file_import"
  | "external_collection_service";

/** Connection states, mirroring supabase enum `connection_status`. */
export type ConnectionStatus =
  | "unconfigured"
  | "testing"
  | "connected"
  | "degraded"
  | "auth_required"
  | "login_required"
  | "blocked"
  | "failed"
  | "disabled";

export interface ScoreDimension {
  key: string;
  label: string;
  weight: number;
  /** normalized 0..1 */
  value: number;
  points: number;
  note: string;
}

export interface EvidenceScore {
  total: number;
  grade: "pass" | "warning" | "blocked";
  dimensions: ScoreDimension[];
  conflictPenalty: number;
}

export interface IntelligenceSource {
  sourceId: string;
  name: string;
  category: IntelCategory;
  sourceType: string;
  authorityLevel: AuthorityLevel;
  isOfficial: boolean;
  collectionMethod: string;
  collectionFrequency: string;
  lastCollectedAt: string;
  status: "active" | "paused" | "error";
  sourceUrl: string;
  relatedEventCount: number;
  /** v2 */
  accessMode?: AccessMode;
  connectionStatus?: ConnectionStatus;
  canonicalDomain?: string;
  requiresAuth?: boolean;
  dataOrigin?: DataOrigin;
  reliability?: number;
  lastError?: string;
  fetchStrategy?: "html_list" | "rss" | "json_api" | "manual" | "sample";
}

export interface CollectionTask {
  taskId: string;
  sourceId: string;
  taskName: string;
  runTime: string;
  status: CollectionStatus;
  foundChange: boolean;
  rawItemCount: number;
  validItemCount: number;
  duplicateItemCount?: number;
  errorMessage?: string;
  generatedEvidenceIds: string[];
  dataOrigin?: DataOrigin;
  durationMs?: number;
  httpStatus?: number | null;
}

export interface EvidenceItem {
  evidenceId: string;
  title: string;
  sourceId: string;
  sourceName: string;
  authorityLevel: AuthorityLevel;
  isOfficial: boolean;
  publishedAt: string;
  collectedAt: string;
  originalUrl: string;
  snapshotText: string;
  summary: string;
  keywords: string[];
  category: IntelCategory;
  verificationStatus: EvidenceStatus;
  quotedByEvents: string[];
  canBePolicyEvidence: boolean;
  /** v2 */
  contentHash?: string;
  version?: number;
  score?: EvidenceScore;
  duplicateOf?: string | null;
  entityHints?: ProductModule[];
  conflictWith?: string[];
  dataOrigin?: DataOrigin;
  author?: string;
  expiresAt?: string | null;
}

export interface ProductImpact {
  module: ProductModule;
  impactLevel: ImpactLevel;
  reason: string;
  evidenceIds: string[];
  suggestedAction: string;
  owner: string;
  /** v2 */
  ruleId?: string;
  confidence?: number;
}

export type TimelineRelation = "before" | "trigger" | "after" | "context" | "conflict";

export interface TimelinePoint {
  at: string;
  label: string;
  evidenceId: string;
  sourceName: string;
  authorityLevel: AuthorityLevel;
  relation: TimelineRelation;
  note: string;
}

/** A reference opinion — deliberately not a verdict. */
export interface EventOpinion {
  headline: string;
  stance: "act" | "watch" | "hold";
  reasoning: string[];
  confidence: number;
  falsifiers: string[];
  verificationSteps: string[];
  watchMetrics: string[];
  /** what the opinion is allowed to be used for */
  usageBoundary: string;
}

export interface IntelligenceEvent {
  eventId: string;
  title: string;
  eventType: EventType;
  summary: string;
  relatedEvidenceIds: string[];
  affectedUsers: string;
  affectedModules: ProductModule[];
  sentiment: Sentiment;
  riskLevel: RiskLevel;
  confidenceLevel: {
    hasOfficialSource: boolean;
    multiSourceCorroborated: boolean;
    hasOriginalUrl: boolean;
    hasSnapshot: boolean;
    hasConflict: boolean;
    humanReviewed: boolean;
  };
  sourceSummary: string;
  productImpact: ProductImpact[];
  recommendedActions: string[];
  owner: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  /** v2 */
  clusterKey?: string;
  confidence?: number;
  opinion?: EventOpinion;
  timeline?: TimelinePoint[];
  publishedTimeStart?: string;
  publishedTimeEnd?: string;
  conflicts?: { evidenceId: string; note: string }[];
  dataOrigin?: DataOrigin;
  evidenceCount?: number;
  distinctSourceCount?: number;
  /** ids of similar historical events used as precedent (episodic memory) */
  precedentEventIds?: string[];
  reviewNote?: string;
}

export interface Report {
  reportId: string;
  reportType: string;
  dateRange: string;
  includedCategories: IntelCategory[];
  summary: string;
  eventIds: string[];
  evidenceIds: string[];
  generatedAt: string;
  /** v2: rendered markdown source of truth */
  markdown?: string;
  dataOrigin?: DataOrigin;
  metrics?: Record<string, number>;
}

/* ---------------------------------------------------------------------- */
/* Pipeline & memory types                                                */
/* ---------------------------------------------------------------------- */

export type StageStatus = "idle" | "running" | "success" | "partial" | "failed" | "skipped";

export interface StageRun {
  stageId: string;
  name: string;
  status: StageStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  inputCount: number;
  outputCount: number;
  metrics: Record<string, number>;
  notes: string[];
}

export interface PipelineRun {
  runId: string;
  startedAt: string;
  finishedAt: string;
  mode: "batch" | "manual" | "live";
  dataOrigin: DataOrigin;
  stages: StageRun[];
  rawDocuments: number;
  newEvidence: number;
  duplicateEvidence: number;
  eventsCreated: number;
  lowQualityBlocked: number;
  idempotentHit: boolean;
  memoryVersion: number;
}

export interface SourcePrior {
  sourceId: string;
  /** Beta-smoothed reliability in 0..1 */
  reliability: number;
  accepted: number;
  rejected: number;
  /** accepted + rejected, surfaced for audit */
  samples: number;
  updatedAt: string;
}

export interface KeywordWeight {
  token: string;
  weight: number;
  hits: number;
  updatedAt: string;
}

export interface PlaybookRule {
  ruleId: string;
  rule: string;
  domain: IntelCategory | "cross";
  support: number;
  confidence: number;
  createdAt: string;
  lastUsedAt: string;
  hits: number;
  source: "learned" | "seed";
}

export interface FeedbackRecord {
  feedbackId: string;
  eventId: string;
  decision: "confirm" | "reject" | "promote" | "demote";
  reason: string;
  actor: string;
  at: string;
  /** snapshot of the score before the feedback, for audit */
  scoreBefore?: number;
}

export interface WorkingMemory {
  lastRunId: string | null;
  seenHashes: string[];
  openClusterKeys: string[];
  notes: string[];
  updatedAt: string;
}

export interface MemorySnapshot {
  version: number;
  createdAt: string;
  updatedAt: string;
  working: WorkingMemory;
  /** compact historical event cards (never full text) */
  episodic: {
    eventId: string;
    title: string;
    clusterKey: string;
    riskLevel: RiskLevel;
    decision: "confirm" | "reject" | "pending";
    at: string;
  }[];
  semantic: {
    sourcePriors: SourcePrior[];
    keywordWeights: KeywordWeight[];
    playbookRules: PlaybookRule[];
    thresholds: { passScore: number; warningScore: number; clusterSimilarity: number };
  };
  feedback: FeedbackRecord[];
}

export const MODULE_LABELS: Record<ProductModule, string> = {
  search: "查询",
  list: "列表",
  price: "价格展示",
  form: "填单",
  payment: "支付",
  order: "订单",
  aftersale: "售后",
  service: "客服",
  student_zone: "学生票专区",
  child_zone: "儿童票专区",
  membership: "会员/营销",
  intl: "国际火车票",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  policy_change: "政策变化",
  competitor_feature: "竞品功能",
  sentiment_hot: "舆情热点",
  complaint_spike: "投诉高发",
  regulatory_risk: "监管风险",
  product_opportunity: "产品机会",
};

export const STATUS_LABELS: Record<EventStatus, string> = {
  new: "新入池",
  evidence_check: "证据校验中",
  human_review: "待人工审核",
  confirmed: "已确认",
  product_review: "待产品评估",
  action_planned: "已定动作",
  assigned: "已指派",
  in_progress: "处理中",
  effect_review: "效果复盘",
  closed: "已关闭",
  watching: "持续观察",
  invalid_lead: "无效线索",
};

export const CATEGORY_LABELS: Record<IntelCategory, string> = {
  policy: "政策监管",
  competitor: "功能竞品",
  sentiment: "舆论反馈",
};

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  unverified: "待校验",
  verifying: "校验中",
  verified_online: "在线已核验",
  verified_snapshot: "快照已核验",
  lead_only: "仅线索",
  conflict: "存在冲突",
  blocked: "不可采信",
  obsolete: "已失效",
};
