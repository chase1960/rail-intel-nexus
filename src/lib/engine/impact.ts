import type { ImpactLevel, ProductImpact, ProductModule } from "@/lib/types";
import type { EventCluster } from "./cluster";
import type { EngineEvidence } from "./evidence";

interface ImpactRule {
  ruleId: string;
  anchors: string[];
  types?: string[];
  module: ProductModule;
  level: ImpactLevel;
  reason: (ctx: { count: number; competitor: boolean }) => string;
  action: string;
  owner: string;
}

/**
 * Impact rules = the product team's accumulated judgment, encoded once and reused
 * every run. This is the asset an LLM cannot invent: which module breaks when X changes.
 */
const RULES: ImpactRule[] = [
  {
    ruleId: "student-zone",
    anchors: ["student"],
    module: "student_zone",
    level: "high",
    reason: ({ count }) => `预约提前期与资格核验规则变化，专区文案/倒计时需同步（${count} 条证据支撑）`,
    action: "更新学生票专区说明，新增开学季预约倒计时",
    owner: "产品·学生票组",
  },
  {
    ruleId: "student-form",
    anchors: ["student"],
    module: "form",
    level: "clear",
    reason: () => "用户普遍误以为「预约成功=购票成功」，下单页需解释预约语义",
    action: "下单页新增预约说明气泡与失败后的下一步引导",
    owner: "产品·交易",
  },
  {
    ruleId: "student-search",
    anchors: ["student"],
    module: "search",
    level: "possible",
    reason: () => "查询日历需标注哪些日期可提交预约",
    action: "查询日历增加「可预约」标记",
    owner: "产品·查询",
  },
  {
    ruleId: "student-service",
    anchors: ["student"],
    module: "service",
    level: "clear",
    reason: ({ count }) => `学生票咨询集中（${count} 条内部/外部信号），客服话术需前置`,
    action: "同步客服话术：预约≠购票、资质核验入口、可改签",
    owner: "客服支持",
  },
  {
    ruleId: "waiting-order",
    anchors: ["waiting"],
    module: "order",
    level: "high",
    reason: () => "候补失败订单缺少原因与排队位次解释，用户误判「提交成功」",
    action: "订单详情增加候补失败解释卡与位次快照",
    owner: "产品·订单",
  },
  {
    ruleId: "waiting-aftersale",
    anchors: ["waiting"],
    module: "aftersale",
    level: "high",
    reason: () => "候补失败后抢票金冻结/退款时效不清，投诉升级风险高",
    action: "退款进度页明示时效，失败即刻解冻",
    owner: "产品·售后",
  },
  {
    ruleId: "waiting-list",
    anchors: ["waiting"],
    module: "list",
    level: "clear",
    reason: () => "候补入口未说明成功率与失败概率",
    action: "候补入口增加期望管理与成功率区间",
    owner: "产品·查询",
  },
  {
    ruleId: "refund-aftersale",
    anchors: ["refund"],
    module: "aftersale",
    level: "high",
    reason: ({ competitor }) =>
      competitor
        ? "竞品已上线退票费预估，我方退票页仍只给结果不给分档"
        : "退票手续费分档不透明，工单高发",
    action: "退票页新增手续费预估与分档时间轴",
    owner: "产品·售后",
  },
  {
    ruleId: "refund-price",
    anchors: ["refund"],
    module: "price",
    level: "clear",
    reason: () => "价格区未展示退改签规则，用户支付后才发现扣费",
    action: "价格区增加退改签规则折叠卡（支付前可见）",
    owner: "产品·交易",
  },
  {
    ruleId: "refund-form",
    anchors: ["refund"],
    module: "form",
    level: "clear",
    reason: () => "支付前需明示退改签规则，满足规程修订要求",
    action: "支付前插入规则摘要确认步骤",
    owner: "产品·交易",
  },
  {
    ruleId: "refund-service",
    anchors: ["refund"],
    module: "service",
    level: "high",
    reason: () => "退票手续费相关工单占比最高，人工解释成本高",
    action: "客服自助入口前置「退票费计算器」",
    owner: "客服支持",
  },
  {
    ruleId: "child-price",
    anchors: ["child"],
    module: "price",
    level: "high",
    reason: () => "身高判定后价格跳变缺少解释，用户以为被多收钱",
    action: "价格模块展示年龄/身高判定依据与切换说明",
    owner: "产品·交易",
  },
  {
    ruleId: "child-form",
    anchors: ["child"],
    module: "form",
    level: "clear",
    reason: () => "填单页需明示儿童票适用规则",
    action: "填单页新增儿童票规则卡（含四个关键数字）",
    owner: "产品·交易",
  },
  {
    ruleId: "child-zone",
    anchors: ["child"],
    module: "child_zone",
    level: "clear",
    reason: () => "专區缺少图示化解释",
    action: "儿童票专区补充身高/年龄图示",
    owner: "产品·家庭出行",
  },
  {
    ruleId: "invoice-order",
    anchors: ["invoice"],
    module: "order",
    level: "high",
    reason: () => "发票入口层级过深，订单详情缺少主 CTA",
    action: "订单详情首屏增加「开发票」主按钮",
    owner: "产品·订单",
  },
  {
    ruleId: "invoice-aftersale",
    anchors: ["invoice"],
    module: "aftersale",
    level: "clear",
    reason: () => "售后卡片未承接开票诉求",
    action: "售后卡片补充开票入口与状态查询",
    owner: "产品·售后",
  },
  {
    ruleId: "stability-payment",
    anchors: ["stability"],
    module: "payment",
    level: "high",
    reason: () => "特定安卓机型支付环节闪退，订单回落为待支付",
    action: "排查机型兼容，支付失败自动恢复订单状态",
    owner: "技术·交易",
  },
  {
    ruleId: "ops-list",
    anchors: ["ops"],
    module: "list",
    level: "possible",
    reason: () => "停运/晚点公告需在列表页透出",
    action: "列表页增加受影响车次提示",
    owner: "产品·查询",
  },
];

/** Competitor moves imply a product gap even when no complaint exists yet. */
const COMPETITOR_GAP: ProductImpact[] = [
  {
    module: "form",
    impactLevel: "clear",
    reason: "竞品已把退改签规则前置到下单页（规则助手），我方仍是静态文案",
    evidenceIds: [],
    suggestedAction: "评估「规则助手」MVP：支付前规则摘要 + 退票费预估",
    owner: "产品·交易",
    ruleId: "competitor-gap-form",
  },
  {
    module: "aftersale",
    impactLevel: "clear",
    reason: "竞品支持退票费一键估算与分档预览",
    evidenceIds: [],
    suggestedAction: "复用退票费预估，作为售后页默认能力",
    owner: "产品·售后",
    ruleId: "competitor-gap-aftersale",
  },
  {
    module: "student_zone",
    impactLevel: "possible",
    reason: "竞品上线学生资质自动核验与开学季提醒",
    evidenceIds: [],
    suggestedAction: "调研学信网核验对接，降低预约失败率",
    owner: "产品·学生票组",
    ruleId: "competitor-gap-student",
  },
];

const LEVEL_WEIGHT: Record<ImpactLevel, number> = { none: 0, possible: 1, clear: 2, high: 3 };

export function deriveImpacts(cluster: EventCluster, evidence: EngineEvidence[]): ProductImpact[] {
  const out = new Map<ProductModule, ProductImpact>();
  const competitor = evidence.some(
    (i) => i.item.authorityLevel === "A" && !i.item.isOfficial && i.classification.category === "competitor",
  );

  const put = (impact: ProductImpact) => {
    const existing = out.get(impact.module);
    if (!existing || LEVEL_WEIGHT[impact.impactLevel] > LEVEL_WEIGHT[existing.impactLevel]) {
      out.set(impact.module, { ...impact, evidenceIds: impact.evidenceIds.length > 0 ? impact.evidenceIds : existing?.evidenceIds ?? [] });
    } else if (existing && impact.evidenceIds.length > 0) {
      existing.evidenceIds = Array.from(new Set([...existing.evidenceIds, ...impact.evidenceIds]));
    }
  };

  for (const rule of RULES) {
    if (!rule.anchors.includes(cluster.clusterKey)) continue;
    if (rule.types && !rule.types.includes(cluster.eventType)) continue;
    const evidenceIds = evidence
      .filter((i) => i.classification.entityHints.includes(rule.module))
      .map((i) => i.evidenceId);
    put({
      module: rule.module,
      impactLevel: rule.level,
      reason: rule.reason({ count: evidence.length, competitor }),
      evidenceIds,
      suggestedAction: rule.action,
      owner: rule.owner,
      ruleId: rule.ruleId,
      confidence: cluster.confidence,
    });
  }

  if (competitor && ["refund", "student"].includes(cluster.clusterKey)) {
    for (const gap of COMPETITOR_GAP) {
      const evidenceIds = evidence
        .filter((i) => i.classification.category === "competitor")
        .map((i) => i.evidenceId);
      put({ ...gap, evidenceIds, confidence: cluster.confidence });
    }
  }

  return [...out.values()].sort((a, b) => LEVEL_WEIGHT[b.impactLevel] - LEVEL_WEIGHT[a.impactLevel]);
}

export function affectedModulesOf(cluster: EventCluster, impacts: ProductImpact[]): ProductModule[] {
  const modules = new Set<ProductModule>([...cluster.anchor.modules, ...impacts.map((i) => i.module)]);
  for (const item of cluster.evidence) {
    for (const hint of item.classification.entityHints) modules.add(hint);
  }
  return [...modules].slice(0, 8);
}
