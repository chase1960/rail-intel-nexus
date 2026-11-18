import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getSnapshot } from "../snapshot";

export default defineTool({
  name: "get_daily_brief",
  title: "获取日报（Markdown）",
  description:
    "直接返回由数据生成的 Markdown 日报：一句话结论、运行概况、高优先级事件与参考意见、影响矩阵、建议动作、待确认事项、证据清单、方法与边界。适合直接贴进飞书文档或群消息。",
  inputSchema: {
    type: z.enum(["daily", "weekly", "topic"]).optional().describe("报告类型，默认 daily"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ type }) => {
    const { report, run } = getSnapshot();
    const markdown = report.markdown ?? "";
    const note =
      type && type !== "daily"
        ? `\n\n> 说明：MCP 返回的是本轮运行生成的日报；周报/专题请在站内「报告生成中心」切换类型生成。`
        : "";
    return {
      content: [{ type: "text", text: `<!-- run ${run.runId} / ${run.dataOrigin} -->\n${markdown}${note}` }],
      structuredContent: {
        reportId: report.reportId,
        runId: run.runId,
        dataOrigin: run.dataOrigin,
        dateRange: report.dateRange,
        summary: report.summary,
        markdown,
      },
    };
  },
});
