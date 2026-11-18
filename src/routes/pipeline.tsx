import { createFileRoute } from "@tanstack/react-router";
import { Play, GitBranch, Timer, ArrowRight } from "lucide-react";
import { store, useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/engine/dates";

export const Route = createFileRoute("/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const { runs, coverage, memory } = useStore();
  const run = runs[0];

  if (!run) {
    return (
      <Card className="p-8 text-sm text-muted-foreground max-w-[1400px]">
        尚无运行记录。点击「运行一次」生成第一轮流水线。
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">流水线</h2>
          <p className="text-sm text-muted-foreground mt-1">
            每次运行逐阶段记账：输入数 / 输出数 / 耗时 / 指标 / 说明。这是「可审计」的实现方式，而不是一句“已完成”。
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => store.run("manual")}
        >
          <Play className="w-3.5 h-3.5" /> 再运行一次
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" /> 运行 <b className="text-foreground">{run.runId}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5" />
            {formatDateTime(run.startedAt)} → {formatDateTime(run.finishedAt)}（
            {run.stages.reduce((s, st) => s + st.durationMs, 0)}ms）
          </span>
          <Badge variant="outline">{run.dataOrigin === "sample" ? "样本语料" : "实时采集"}</Badge>
          <Badge variant="outline">记忆 v{run.memoryVersion}</Badge>
          {run.idempotentHit && <Badge variant="outline">幂等命中：本轮全为已入库内容</Badge>}
        </div>
      </Card>

      <div className="space-y-2">
        {run.stages.map((stage, i) => (
          <Card key={stage.stageId} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium">{stage.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{stage.stageId}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-muted-foreground tabular-nums">
                  {stage.inputCount} <ArrowRight className="inline w-3 h-3" /> {stage.outputCount}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {stage.durationMs} ms
                </Badge>
                <Badge variant="secondary" className="text-[10px]">
                  {stage.status}
                </Badge>
              </div>
            </div>
            {Object.keys(stage.metrics).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {Object.entries(stage.metrics).map(([key, value]) => (
                  <span key={key} className="text-[11px] px-2 py-1 rounded bg-muted text-muted-foreground">
                    {key}: <b className="text-foreground tabular-nums">{value}</b>
                  </span>
                ))}
              </div>
            )}
            {stage.notes.length > 0 && (
              <div className="mt-3 text-[11px] text-muted-foreground space-y-0.5 border-t pt-2">
                {stage.notes.slice(0, 6).map((note, idx) => (
                  <div key={idx}>· {note}</div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">源覆盖（本轮每个源的真实产出）</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-2 font-normal">源</th>
              <th className="text-left py-2 font-normal">访问方式</th>
              <th className="text-left py-2 font-normal">连接状态</th>
              <th className="text-right py-2 font-normal">原文</th>
              <th className="text-right py-2 font-normal">有效</th>
              <th className="text-right py-2 font-normal">去重</th>
              <th className="text-left py-2 font-normal pl-3">说明</th>
            </tr>
          </thead>
          <tbody>
            {coverage.map((source) => (
              <tr key={source.sourceId} className="border-t">
                <td className="py-2 pr-2">
                  <span className="font-medium">{source.name}</span>
                  <span className="text-muted-foreground ml-1.5">{source.authorityLevel}</span>
                </td>
                <td className="py-2 text-muted-foreground font-mono text-[11px]">{source.accessMode}</td>
                <td className="py-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      source.connectionStatus === "connected"
                        ? "text-emerald-700 border-emerald-200"
                        : source.connectionStatus === "login_required"
                          ? "text-amber-700 border-amber-200"
                          : "text-slate-600"
                    }`}
                  >
                    {source.connectionStatus}
                  </Badge>
                </td>
                <td className="py-2 text-right tabular-nums">{source.docs}</td>
                <td className="py-2 text-right tabular-nums">{source.newEvidence}</td>
                <td className="py-2 text-right tabular-nums">{source.duplicates}</td>
                <td className="py-2 pl-3 text-muted-foreground">{source.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-[11px] text-muted-foreground mt-3">
          connected = 公网可直采；login_required / unconfigured = 需登录态或内部接口，本轮走样本或人工导入；memory v
          {memory.version}
        </div>
      </Card>

      {runs.length > 1 && (
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">运行历史</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-2 font-normal">运行</th>
                <th className="text-left py-2 font-normal">时间</th>
                <th className="text-left py-2 font-normal">模式</th>
                <th className="text-right py-2 font-normal">原文</th>
                <th className="text-right py-2 font-normal">证据</th>
                <th className="text-right py-2 font-normal">事件</th>
                <th className="text-right py-2 font-normal">记忆版本</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(1).map((r) => (
                <tr key={r.runId} className="border-t">
                  <td className="py-2 font-mono text-[11px]">{r.runId}</td>
                  <td className="py-2">{formatDateTime(r.finishedAt)}</td>
                  <td className="py-2">{r.mode}</td>
                  <td className="py-2 text-right tabular-nums">{r.rawDocuments}</td>
                  <td className="py-2 text-right tabular-nums">{r.newEvidence}</td>
                  <td className="py-2 text-right tabular-nums">{r.eventsCreated}</td>
                  <td className="py-2 text-right tabular-nums">v{r.memoryVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
