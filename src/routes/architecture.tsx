import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/architecture")({
  component: ArchitecturePage,
});

const FLOW = [
  { title: "① 源计划", detail: "声明式 registry：18 个源，含访问方式、连接状态、权威级别、抓取策略" },
  { title: "② 原文采集", detail: "公网直采 / 登录态人工转发 / 内部接口 / 样本语料，四类来源统一成 RawDocument" },
  { title: "③ 归一化", detail: "去 HTML、零宽字符、全半角统一、内容指纹（FNV-1a）" },
  { title: "④ 双层去重", detail: "精确指纹 + 跨源近重复（相似度阈值），保留最早版本，其余记为 version" },
  { title: "⑤ 分类与实体", detail: "源类别为先验，文本信号覆盖；抽取产品模块、风险信号、数字口径" },
  { title: "⑥ 可解释打分", detail: "权威度 25% + 可核验 20% + 多源印证 20% + 时效 15% + 密度 10% + 先例/冲突修正" },
  { title: "⑦ 主题聚合", detail: "8 个主题锚点聚成事件；检测口径冲突；还原 before / trigger / after 时间线" },
  { title: "⑧ 影响与意见", detail: "19 条影响规则 + 竞品 gap；输出立场、依据、证伪条件、验证动作、使用边界" },
  { title: "⑨ 报告与记忆", detail: "报告由数据生成；运行结果写回 working / episodic / semantic" },
];

const GENERALIZE = [
  {
  domain: "电商平台政策/规则监测",
    reuse: "源层 + 打分 + 冲突检测 + 影响规则表",
    change: "换 registry：平台规则页、商家论坛、竞品活动页；影响模块换成「价格/履约/售后」",
  },
  {
    domain: "SaaS 竞品情报",
    reuse: "全链路，尤其版本更新与舆情聚合",
    change: "源换成官网 changelog、G2/Capterra 评论、Twitter；锚点换成功能模块",
  },
  {
  domain: "金融产品监管跟踪",
    reuse: "S/A 级源优先 + 政策事实判定 + 反证机制",
    change: "提高官方源权重、缩短时效阈值、增加「合规复核」必过环节",
  },
  {
    domain: "品牌舆情与危机预警",
    reuse: "情感聚合 + 冲突标记 + P1 分级",
    change: "锚点换成产品线/事件类型；增加传播量指标与响应 SLA",
  },
];

const NARRATIVE = [
  {
    q: "这个项目解决什么问题？",
    a: "把「散在各处的政策、竞品、用户反馈」变成「可回溯证据 + 可解释判断 + 可执行动作」。核心不是爬虫，而是让产品团队敢用这份情报做决策。",
  },
  {
    q: "为什么不是直接用大模型总结？",
    a: "大模型会编造原文、混淆口径、把一条小红书当政策依据。这里的做法是：规则化打分 + 冲突隔离 + 原文快照 + 立场与证伪条件，模型只在被允许的范围内表达。",
  },
  {
    q: "AI 产品经理在这件事里做了什么？",
    a: "定义了 9 段流水线的边界、12 个产品模块的影响规则、8 个主题锚点、5 维评分与阈值、以及「什么情况必须拦住不给结论」。这些是产品判断，不是工程实现。",
  },
  {
    q: "自进化怎么落地，不是噱头？",
    a: "人工确认/驳回 → 更新源先验（Beta 平滑）、关键词权重、playbook 规则 → 下一轮打分与聚合改变。反馈前后可在记忆中心看到具体数值变化。",
  },
  {
    q: "如何与内部策略/PRD 结合？",
    a: "影响规则表就是策略的编码：模块 × 等级 × 建议动作 × 负责人。MCP 暴露只读工具，内部 Agent 可直接取「今日结论 + 证据 + 参考意见」，不需要人去翻页面。",
  },
];

function ArchitecturePage() {
  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">架构与边界</h2>
        <p className="text-sm text-muted-foreground mt-1">
          这一页是给“看代码的人”和“看判断的人”同时准备的：左边是工程链路，右边是产品判断与可复用边界。
        </p>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">9 段流水线（每段都有输入/输出/指标/日志）</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {FLOW.map((step) => (
            <div key={step.title} className="p-3 rounded border bg-card">
              <div className="text-xs font-medium">{step.title}</div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{step.detail}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">可泛化性：换域只需要换哪一层</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-2 font-normal">场景</th>
                <th className="text-left py-2 font-normal">可直接复用</th>
                <th className="text-left py-2 font-normal">需要替换</th>
              </tr>
            </thead>
            <tbody>
              {GENERALIZE.map((row) => (
                <tr key={row.domain} className="border-t">
                  <td className="py-2 pr-2 font-medium">{row.domain}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{row.reuse}</td>
                  <td className="py-2 text-muted-foreground">{row.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-[11px] text-muted-foreground mt-3">
            抽象出来的四件事：<b>源注册表</b>、<b>评分函数</b>、<b>影响规则表</b>、<b>记忆三层</b>。业务差异全部落在这四个可替换点上。
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">MCP 契约（供内部 Agent 调用）</div>
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded bg-muted font-mono text-[11px]">get_overview → 今日结论 + 指标 + 最高优先级事件</div>
            <div className="p-2 rounded bg-muted font-mono text-[11px]">list_sources → 源覆盖与连接状态</div>
            <div className="p-2 rounded bg-muted font-mono text-[11px]">list_evidence → 证据 + 评分拆解 + 校验状态</div>
            <div className="p-2 rounded bg-muted font-mono text-[11px]">list_events → 事件 + 等级 + 置信度 + 立场</div>
            <div className="p-2 rounded bg-muted font-mono text-[11px]">get_event → 单事件的参考意见/时间线/冲突/影响</div>
            <div className="p-2 rounded bg-muted font-mono text-[11px]">get_daily_brief → 直接返回 Markdown 日报</div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-3">
            工具返回的是引擎现场计算结果，不再是写死的 mock。鉴权留待接入内部 SSO（当前为公开只读演示）。
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">产品经理视角：五个必答问题</div>
        <div className="space-y-3">
          {NARRATIVE.map((item) => (
            <div key={item.q} className="border-l-2 border-primary/40 pl-3">
              <div className="text-xs font-medium">{item.q}</div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{item.a}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">明确的边界与下一步</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-medium mb-1.5">当前不做（避免假装完成）</div>
            <ul className="space-y-1 text-muted-foreground text-[11px]">
              <li>· 不声称真实抓取：样本语料逐条标注 data_origin=sample，时间相对生成</li>
              <li>· 不声称云端存储：仍为本地 localStorage，Supabase 待接入（schema 已有）</li>
              <li>· 不把低权威源当事实：冲突证据不进入结论，仅作为待核线索</li>
              <li>· 不做自动对外发布：报告仅内部使用，对外需回 S/A 级原文</li>
            </ul>
          </div>
          <div>
            <div className="font-medium mb-1.5">下一步（按风险从低到高）</div>
            <ul className="space-y-1 text-muted-foreground text-[11px]">
              <li>1. 打通 3–5 个可直采源（12306 公告 / 国铁 / App Store 评论）</li>
              <li>2. 接 Supabase：证据、事件、报告落库，MCP 加鉴权</li>
              <li>3. 人工反馈进工作流（飞书审批），形成正式闭环</li>
              <li>4. 评测集：30 条标注样本衡量「拦截率 / 误报率 / 漏报率」</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Badge variant="outline" className="text-[10px]">Next.js / TanStack Start</Badge>
          <Badge variant="outline" className="text-[10px]">纯前端引擎（可移植到 Node 服务）</Badge>
          <Badge variant="outline" className="text-[10px]">无 LLM 依赖，可离线复现</Badge>
        </div>
      </Card>
    </div>
  );
}
