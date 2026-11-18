import type {
  EventType,
  IntelCategory,
  IntelligenceSource,
  ProductModule,
  Sentiment,
} from "@/lib/types";
import type { NormalizedDocument } from "./dedupe";

export interface Classification {
  category: IntelCategory;
  eventType: EventType;
  keywords: string[];
  entityHints: ProductModule[];
  sentiment: Sentiment;
  riskSignals: string[];
  numericClaims: string[];
}

const POLICY_SIGNALS = ["通知", "规程", "征求意见", "公告", "规定", "政策", "口径", "修订", "自本月起", "截止日期"];
const COMPETITOR_SIGNALS = ["上线", "升级", "新增", "版本", "功能", "入口", "产品说明", "App", "监测", "能力"];
const SENTIMENT_SIGNALS = ["投诉", "吐槽", "评论", "话题", "笔记", "讨论", "满意度", "看不懂", "闪退", "失败", "吵翻"];
const REGULATORY_SIGNALS = ["征求意见", "修订", "监管", "合规", "处罚", "约谈", "规程"];

const MODULE_HINTS: { module: ProductModule; keywords: string[] }[] = [
  { module: "student_zone", keywords: ["学生票", "学生", "开学季", "预约", "资质核验"] },
  { module: "child_zone", keywords: ["儿童票", "儿童", "身高", "带娃"] },
  { module: "aftersale", keywords: ["退票", "改签", "退改签", "退款", "手续费"] },
  { module: "price", keywords: ["价格", "票价", "费用", "扣了", "收费"] },
  { module: "order", keywords: ["订单", "发票", "电子发票", "开票"] },
  { module: "list", keywords: ["候补", "排队", "抢票", "列表"] },
  { module: "payment", keywords: ["支付", "扣款", "冻结", "闪退"] },
  { module: "form", keywords: ["填单", "下单页", "填写", "信息", "预约申请"] },
  { module: "service", keywords: ["客服", "话术", "工单", "咨询", "口径"] },
  { module: "search", keywords: ["查询", "搜索", "日历", "筛选"] },
  { module: "membership", keywords: ["会员", "营销", "权益"] },
  { module: "intl", keywords: ["国际", "跨境", "境外"] },
];

const NEGATIVE_WORDS = ["看不懂", "不清晰", "失败", "扣", "投诉", "吐槽", "吵翻", "找不到", "闪退", "质疑", "不一致", "被坑", "不满"];
const POSITIVE_WORDS = ["优化", "提升", "支持", "便利", "缓解", "改善", "自动", "一键"];

function countHits(text: string, words: string[]): number {
  const lower = text.toLowerCase();
  return words.reduce((sum, word) => (lower.includes(word.toLowerCase()) ? sum + 1 : sum), 0);
}

export function classifyDocument(doc: NormalizedDocument, source: IntelligenceSource): Classification {
  const text = `${doc.cleanTitle} ${doc.normalizedText}`;
  const policy = countHits(text, POLICY_SIGNALS);
  const competitor = countHits(text, COMPETITOR_SIGNALS);
  const sentiment = countHits(text, SENTIMENT_SIGNALS);

  // Source category is the prior; strong textual signals can override it.
  let category: IntelCategory = source.category;
  if (sentiment >= 2 && sentiment > policy && sentiment > competitor && source.category !== "policy") {
    category = "sentiment";
  } else if (policy >= 2 && policy > sentiment && source.isOfficial) {
    category = "policy";
  }

  const isRegulatory = countHits(text, REGULATORY_SIGNALS) >= 2;
  let eventType: EventType = "product_opportunity";
  if (category === "policy") eventType = isRegulatory ? "regulatory_risk" : "policy_change";
  if (category === "competitor") {
    eventType = countHits(text, ["上线", "升级", "新增", "版本"]) >= 1 ? "competitor_feature" : "product_opportunity";
  }
  if (category === "sentiment") {
    eventType = countHits(text, ["投诉", "工单", "单", "闪退"]) >= 2 ? "complaint_spike" : "sentiment_hot";
  }

  const entityHints = MODULE_HINTS.filter((hint) => countHits(text, hint.keywords) > 0).map((h) => h.module);

  const negative = countHits(text, NEGATIVE_WORDS);
  const positive = countHits(text, POSITIVE_WORDS);
  let polarity: Sentiment = "neutral";
  if (negative > positive && negative > 0) polarity = "negative";
  else if (positive > negative && positive > 0) polarity = "positive";
  else if (negative > 0 && positive > 0) polarity = "mixed";

  const numericClaims =
    doc.normalizedText.match(/\d+(?:\.\d+)?(?:\s*%|\s*天|\s*小时|\s*单|\s*米|\s*万|\s*分|\s*条)/g) ?? [];

  const riskSignals: string[] = [];
  if (isRegulatory) riskSignals.push("监管口径可能变化");
  if (doc.normalizedText.includes("不一致") || doc.normalizedText.includes("与官方")) {
    riskSignals.push("存在与官方口径不一致的表述");
  }
  if (negative >= 2) riskSignals.push("负面反馈聚集");
  if (countHits(text, ["退款", "扣款", "冻结"]) > 0) riskSignals.push("涉及资金，投诉升级风险高");

  return {
    category,
    eventType,
    keywords: doc.keywords,
    entityHints,
    sentiment: polarity,
    riskSignals,
    numericClaims,
  };
}
