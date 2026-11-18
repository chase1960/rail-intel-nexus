import { defineMcp } from "@lovable.dev/mcp-js";
import listSources from "./tools/list-sources";
import listEvents from "./tools/list-events";
import getEvent from "./tools/get-event";
import listEvidence from "./tools/list-evidence";
import getOverview from "./tools/get-overview";
import getDailyBrief from "./tools/get-daily-brief";

export default defineMcp({
  name: "train-ticket-intel-mcp",
  title: "火车票情报中台 MCP",
  version: "0.2.0",
  instructions:
    "面向火车票产品团队的内部情报 Agent 中台，覆盖政策监管、功能竞品、舆论反馈三条线。所有工具返回的都是引擎现场计算的结果（采集→去重→打分→聚合→影响判断→参考意见），不是写死的演示对象。\n\n" +
    "建议调用顺序：get_overview 了解态势 → list_events / get_event 看具体事件与参考意见 → list_evidence 回溯证据与评分 → list_sources 看源覆盖 → get_daily_brief 直接取 Markdown 日报。\n\n" +
    "重要边界：当前数据来自样本语料（时间相对当前生成，dataOrigin=sample），不代表真实抓取；参考意见的 stance=act/watch/hold 仅用于内部排序与验证，政策事实必须回到 S/A 级官方原文，对外沟通不得直接引用本服务结论。",
  tools: [getOverview, getDailyBrief, listSources, listEvidence, listEvents, getEvent],
});
