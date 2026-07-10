// Domain types for the Train Ticket Intelligence Hub demo.
export type AuthorityLevel = "S" | "A" | "B" | "C" | "D";
export type IntelCategory = "policy" | "competitor" | "sentiment";
export type RiskLevel = "P1" | "P2" | "P3";
export type Sentiment = "negative" | "neutral" | "positive" | "mixed";
export type EventStatus =
  | "unverified"
  | "confirmed"
  | "lead"
  | "product_review"
  | "in_progress"
  | "done"
  | "watching";
export type EventType =
  | "policy_change"
  | "competitor_feature"
  | "sentiment_hot"
  | "complaint_spike"
  | "regulatory_risk"
  | "product_opportunity";
export type EvidenceStatus = "unverified" | "confirmed" | "lead" | "obsolete" | "conflict";
export type CollectionStatus = "success" | "failed" | "running";
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
  errorMessage?: string;
  generatedEvidenceIds: string[];
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
}

export interface ProductImpact {
  module: ProductModule;
  impactLevel: ImpactLevel;
  reason: string;
  evidenceIds: string[];
  suggestedAction: string;
  owner: string;
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
  unverified: "待校验",
  confirmed: "已确认",
  lead: "线索",
  product_review: "待产品评估",
  in_progress: "处理中",
  done: "已完成",
  watching: "持续观察",
};

export const CATEGORY_LABELS: Record<IntelCategory, string> = {
  policy: "政策监管",
  competitor: "功能竞品",
  sentiment: "舆论反馈",
};
