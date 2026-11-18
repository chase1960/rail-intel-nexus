# 架构说明 · rail-intel-nexus

本文回答三件事：**流水线怎么跑、数据怎么流、为什么这么切**。所有代码在 `src/lib/engine/`，纯函数、无 React、无网络、可单测。

## 1. 十阶段流水线

| # | stage | 输入 → 输出 | 关键动作 | 失败/降级语义 |
| --- | --- | --- | --- | --- |
| 1 | `plan` | 18 源 → 17 源 | 读注册表，判断哪些源本轮可达 | 不可达源不进入采集，记 note |
| 2 | `ingest` | 18 源 → 24 doc | 拉原文，打 `sourceId/publishedAt/author/dataOrigin` | 单源失败 → 任务 `partial`，不整轮失败 |
| 3 | `normalize` | 24 → 24 | 剥 HTML、去零宽字符、NFKC、空白折叠、FNV-1a 指纹 | 空正文 → 直接判 blocked |
| 4 | `dedupe` | 24 → 22 | 层 1 内容指纹；层 2 跨源近重复（阈值 0.82）；层 3 跨运行已见 | 跨运行重复**不丢弃**，标 `reused` 复用旧证据 |
| 5 | `classify` | 22 → 22 | 源类别为先验 + 文本信号覆盖；抽 12 模块实体、风险信号、数字口径 | 无信号 → `sentiment/general` |
| 6 | `score` | 22 → 20 | 5 维打分（先无冲突）→ 粗聚合 → 检出冲突 → **带冲突二次打分** | 分 < 55 → `blocked`，不进聚合 |
| 7 | `cluster` | 20 → 5 | 8 个主题锚点聚合；类别投票定事件类型；代表证据取中选类别最高分 | 锚点未命中 → `general` |
| 8 | `judge` | 5 → 5 | 19 条影响规则 → 模块矩阵；生成参考意见 | 未命中规则 → "需人工判断" |
| 9 | `report` | 5 → 1 | 生成 Markdown（唯一真源），章节编号动态 | — |
| 10 | `memory` | 5 → N | 写 working/episodic/semantic 快照，版本 +1 | 保留既有人工决策 |

每阶段产出 `StageRun{stageId,name,status,startedAt,finishedAt,durationMs,inputCount,outputCount,metrics,notes}`，在「流水线」页面直出——这是"可审计"的物理载体。

## 2. 数据流与身份

```
RawDocument(docId, sourceId, title, url, publishedAt, text)
   └─ normalize → NormalizedDocument(+cleanTitle,+contentHash,+keywords,+summary)
        └─ evidenceIdFor = "ev_" + contentHash[0:10]      // 内容即身份，天然幂等

EventCluster(clusterKey = anchor.key, evidence[], conflicts[], timeline[], rep, confidence, riskLevel)
   └─ eventIdFor = "evt_" + hash(clusterKey + startDate)[0:8]  // 同主题同日 = 同事件
```

**为什么内容即身份**：重复跑同一批语料不会产生新证据，也不会把「浏览量」这类噪声当新信号；事件 ID 绑「主题 + 起始日期」，跨天同一主题会自然生成新事件，避免一个事件被无限追加成"永远在更新"。

## 3. 主题锚点（8 个）

| key | 覆盖的业务面 | 典型信号 |
| --- | --- | --- |
| `student` | 学生票 | 学生票、学生优惠、资质核验、开学季 |
| `child` | 儿童票 | 儿童票、身高、年龄、免票 |
| `waiting` | 候补 | 候补、排队、兑现、位次 |
| `refund` | 退改签 | 退票、改签、手续费、费率 |
| `invoice` | 电子发票 | 发票、报销、开具 |
| `stability` | 支付稳定性 | 支付失败、扣款、重复支付 |
| `intl` | 国际联运 | 国际、跨境、护照 |
| `ops` | 运营公告 | 停运、加开、调图、春运 |

锚点用「命中数最多、平手取靠前」策略，避免多主题长文被强行归到低频主题。

## 4. 事件类型与代表证据

改造中发现的一类真实缺陷：**同一锚点下政策文件与竞品发布混在一起，事件类型与标题互相矛盾**（例如标题是"去哪儿新增退票费预估"，类型却是 `policy_change`）。

当前规则：

1. 先按**信息类别**投票（policy / competitor / sentiment），官方源双票；平票按 `policy > competitor > sentiment`；
2. 由类别映射事件类型：policy → `policy_change`（风险信号过半 → `regulatory_risk`）；competitor → `competitor_feature`；sentiment → `complaint_spike`（投诉源过半）或 `sentiment_hot`；
3. **代表证据**（决定标题/时间线 trigger）取"中选类别里分数最高的一条"，保证标题、类型、`stance` 三者一致。

## 5. 置信度与风险分级

```
confidence = 0.35 × avg(score) + 0.35 × max(score) + 0.18 × min(1, distinctSources/4) + 0.12 × hasOfficial
P1: confidence ≥ 0.78 且 (政策类 或 独立来源 ≥ 3)  |  或资金类风险 ≥ 3 条  |  或政策类存在冲突
P2: confidence ≥ 0.6 或证据 ≥ 2
P3: 其余
```

参考意见的立场与置信度解耦：**有冲突 / 无官方源 / confidence < 0.62 → `watch`；冲突且 confidence < 0.5 → `hold`。** 也就是"分数高"不等于"可以动手"，"没有官方原文"一律先观察。

## 6. 与成熟产品的对齐（设计参考）

| 成熟做法 | 本项目对应 | 差异/取舍 |
| --- | --- | --- |
| RAG 的"引用必达" | 每条证据强制 `originalUrl` + `snapshotText`；报告尾部证据清单 | 快照尚未落对象存储 |
| Agent workflow 的"阶段可见" | 10 阶段记账 + 每页可下钻 | 未做单阶段重跑（重跑=整轮） |
| 事实验证的"多源印证" | 锚点内独立来源计数进入打分与置信度 | 未做来源独立性去重（同一集团媒体仍算独立） |
| Memory：working / episodic / semantic | 三层记忆 + Beta 先验 + 反馈闭环 | 未做向量召回，语义层是关键词权重 |
| Human-in-the-loop | 12 态工作流 + 反馈四动作 + 冲突隔离 | 无审批流集成（预留 MCP） |
| 自进化的边界 | 只改权重与规则，不改事实；每次反馈留 `scoreBefore` | 无自动回滚，靠人工 reset |

## 7. 引擎不变量（改代码前先读）

1. **同一输入 + 同一记忆 → 同一输出**（时间显式传入，不读 `Date.now()`）。
2. **任何进入前端的数字都必须来自 `PipelineOutput`**，不得硬编码。
3. **`blocked` 证据不进入聚合**，但保留在证据库用于解释"为什么没采纳"。
4. **冲突证据永不带 `canBePolicyEvidence`**。
5. **`dataOrigin='sample'` 必须在 UI/报告/MCP 三处同时可见**。
