import { defineMcp } from "@lovable.dev/mcp-js";
import listSources from "./tools/list-sources";
import listEvents from "./tools/list-events";
import getEvent from "./tools/get-event";
import listEvidence from "./tools/list-evidence";
import getOverview from "./tools/get-overview";

export default defineMcp({
  name: "train-ticket-intel-mcp",
  title: "火车票情报中台 MCP",
  version: "0.1.0",
  instructions:
    "面向同程旅行火车票产品团队的内部情报 Agent 中台。围绕政策监管、功能竞品、舆论反馈三个方向,汇聚可追溯的信息源、原文证据与已聚合的情报事件。使用 get_overview 快速了解态势;list_sources / list_evidence 检索原始情报;list_events + get_event 查看已聚合的高价值事件及其对产品模块的影响。注意:本 MCP 服务器为公开演示,返回的均为 Demo 模拟数据。",
  tools: [getOverview, listSources, listEvidence, listEvents, getEvent],
});
