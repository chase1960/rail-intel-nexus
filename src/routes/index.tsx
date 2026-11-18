import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ClipboardCheck,
  FileBarChart,
  Gauge,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { riskClass, impactColor, impactLabel } from "@/lib/style-helpers";
import {
  CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  MODULE_LABELS,
  STATUS_LABELS,
  type IntelCategory,
  type ProductModule,
} from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, relativeFrom } from "@/lib/engine/dates";

export const Route = createFileRoute("/")({
  component: OverviewPage,
});

const IMPACT_COLS: ProductModule[] = [
  "search",
  "list",
  "price",
  "form",
  "payment",
  "order",
  "aftersale",
  "service",
];

function OverviewPage() {
  const navigate = useNavigate();
  const { events, evidence, runs, ...state } = useStore();
  const [cellDetail, setCellDetail] = useState<{ eventId: string; module: ProductModule } | null>(null);
  const lastRun = runs[0];
  const report0 = state.reports[0];
  const memory = state.memory;

  const criticalPriority = events.filter((e) => e.riskLevel === "P1" || e.riskLevel === "P2");
  const cellDetailData = cellDetail
    ? events.find((e) => e.eventId === cellDetail.eventId)?.productImpact.find((p) => p.module === cellDetail.module)
    : null;
  const cellDetailEvent = cellDetail ? events.find((e) => e.eventId === cellDetail.eventId) : null;

  const categoryStats = useMemo(() => {
    const evidenceCategory = new Map(evidence.map((e) => [e.evidenceId, e.category]));
    return (["policy", "competitor", "sentiment"] as IntelCategory[]).map((category) => {
      const items = events.filter((e) => evidenceCategory.get(e.relatedEvidenceIds[0]) === category);
      return {
        category,
        title: CATEGORY_LABELS[category],
        total: items.length,
        high: items.filter((e) => e.riskLevel === "P1").length,
        key: items[0]?.title ?? "本轮无新增",
        next: items[0]?.recommendedActions[0] ?? "—",
          tone:
          category === "policy"
            ? "border-t-blue-500"
            : category === "competitor"
              ? "border-t-emerald-500"
              : "border-t-amber-500",
      };
    });
  }, [events, evidence]);

  if (!lastRun) {
    return (
      <div className="max-w-[1400px]">
        <h2 className="text-xl font-semibold">情报总览</h2>
        <Card className="p-8 mt-4 text-sm text-muted-foreground">
          正在初始化：首次打开会运行一次完整流水线（采集 → 去重 → 打分 → 聚合 → 报告）。
        </Card>
      </div>
    );
  }

  const stages = lastRun.stages;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">情报总览</h2>
          <p className="text-sm text-muted-foreground mt-1">
            所有数字由流水线计算得出｜最近运行 {formatDateTime(lastRun.finishedAt)}（{relativeFrom(lastRun.finishedAt)}）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px]">
            {lastRun.dataOrigin === "sample" ? "样本语料（时间相对生成）" : "实时采集"}
          </Badge>
          <Badge variant="outline" className="text-[11px]">
            记忆 v{memory.version}
          </Badge>
        </div>
      </div>

      {/* Pipeline strip with real stage results */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-muted-foreground">情报生产链路（本次运行的真实产出）</div>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate({ to: "/pipeline" })}>
            查看阶段日志 →
          </Button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {stages.map((stage, i) => (
            <div key={stage.stageId} className="flex items-center gap-1 shrink-0">
              <div
                className="px-2.5 py-1.5 rounded-md bg-primary/8 text-primary text-[11px] font-medium border border-primary/15"
                title={stage.notes.join(" / ")}
              >
                <div>{stage.name}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">
                  {stage.inputCount} → {stage.outputCount}
                </div>
              </div>
              {i < stages.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Metrics — computed, never hardcoded */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "本次原文", value: lastRun.rawDocuments, icon: FileText, tone: "text-blue-600 bg-blue-50" },
          { label: "有效证据", value: lastRun.newEvidence, icon: CheckCircle2, tone: "text-emerald-600 bg-emerald-50" },
          { label: "去重命中", value: lastRun.duplicateEvidence, icon: Gauge, tone: "text-slate-600 bg-slate-50" },
          { label: "情报事件", value: lastRun.eventsCreated, icon: TrendingUp, tone: "text-primary bg-primary/8" },
          {
            label: "P1 事件",
            value: events.filter((e) => e.riskLevel === "P1").length,
            icon: AlertTriangle,
            tone: "text-red-600 bg-red-50",
          },
          {
            label: "待人工确认",
            value: events.filter((e) => e.status === "human_review").length,
            icon: ClipboardCheck,
            tone: "text-amber-600 bg-amber-50",
          },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label} className="p-4">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center ${m.tone} mb-2.5`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-semibold tabular-nums">{m.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.label}</div>
            </Card>
          );
        })}
      </div>

      {/* One-line conclusion — generated from the report, not typed by hand */}
      <Card className="p-5 bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-l-primary">
        <div className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> 本次一句话结论（报告第 1 节原文）
        </div>
        <div className="text-sm leading-relaxed">{report0?.summary ?? "尚未生成报告"}</div>
        <div className="flex items-center gap-2 mt-3">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate({ to: "/reports" })}>
            打开完整报告
          </Button>
          <span className="text-[11px] text-muted-foreground">
            低分拦截 {lastRun.lowQualityBlocked} 条 · 冲突 {evidence.filter((e) => e.verificationStatus === "conflict").length} 条
          </span>
        </div>
      </Card>

      {/* Three categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categoryStats.map((c) => (
          <Card key={c.category} className={`p-4 border-t-4 ${c.tone}`}>
            <div className="text-sm font-semibold">{c.title}</div>
            <div className="flex gap-4 mt-3">
              <div>
                <div className="text-2xl font-semibold tabular-nums">{c.total}</div>
                <div className="text-[11px] text-muted-foreground">本轮事件</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-red-600">{c.high}</div>
                <div className="text-[11px] text-muted-foreground">P1</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">重点事件</div>
            <div className="text-sm mt-1 line-clamp-2">{c.key}</div>
            <div className="mt-3 text-xs text-muted-foreground">下一步建议</div>
            <div className="text-sm mt-1 text-primary line-clamp-2">{c.next}</div>
          </Card>
        ))}
      </div>

      {/* High priority */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">高优先级事件（P1 / P2）</h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate({ to: "/events" })}>
            查看全部 →
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {criticalPriority.map((e) => (
            <Card
              key={e.eventId}
              className="p-4 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
              onClick={() => navigate({ to: "/events", search: { open: e.eventId } as never })}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-medium text-sm leading-tight">{e.title}</div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${riskClass(e.riskLevel)}`}>
                  {e.riskLevel}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground line-clamp-2 mb-3">{e.summary}</div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="secondary" className="text-[10px]">
                  {EVENT_TYPE_LABELS[e.eventType]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {e.evidenceCount} 条证据 · {e.distinctSourceCount} 源
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  置信度 {e.confidence}%
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {STATUS_LABELS[e.status]}
                </Badge>
              </div>
              {e.opinion && (
                <div className="text-[11px] text-primary bg-primary/5 rounded px-2 py-1.5 mb-2">
                  {e.opinion.stance === "act" ? "可行动" : e.opinion.stance === "watch" ? "先观察" : "暂缓"}：{e.opinion.headline}
                </div>
              )}
              <div className="text-[11px] text-muted-foreground pt-2 border-t">
                影响：{e.affectedModules.slice(0, 4).map((m) => MODULE_LABELS[m]).join(" · ")}
              </div>
              <div className="text-[11px] text-primary mt-1.5">下一步：{e.recommendedActions[0]}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Impact matrix preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">产品影响矩阵预览（由规则表推导）</h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate({ to: "/impact" })}>
            查看完整图谱 →
          </Button>
        </div>
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-2 pr-3 font-normal w-56">事件</th>
                {IMPACT_COLS.map((m) => (
                  <th key={m} className="px-1 py-2 font-normal text-center">
                    {MODULE_LABELS[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criticalPriority.map((e) => (
                <tr key={e.eventId} className="border-t">
                  <td className="py-2 pr-3 font-medium truncate max-w-[14rem]">{e.title}</td>
                  {IMPACT_COLS.map((m) => {
                    const p = e.productImpact.find((x) => x.module === m);
                    const lvl = p?.impactLevel ?? "none";
                    return (
                      <td key={m} className="px-1 py-1 text-center">
                        <button
                          className={`w-full py-1.5 rounded text-[10px] ${impactColor(lvl)} ${
                            lvl !== "none" ? "hover:ring-2 hover:ring-primary/30 cursor-pointer" : "cursor-default"
                          }`}
                          onClick={() => lvl !== "none" && setCellDetail({ eventId: e.eventId, module: m })}
                          disabled={lvl === "none"}
                        >
                          {impactLabel(lvl)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={!!cellDetail} onOpenChange={(o) => !o && setCellDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cellDetailEvent?.title} · {cellDetailData && MODULE_LABELS[cellDetailData.module]}
            </DialogTitle>
          </DialogHeader>
          {cellDetailData && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">影响等级 / 规则</div>
                <div>
                  {cellDetailData.impactLevel} · {cellDetailData.ruleId}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">影响原因</div>
                <div>{cellDetailData.reason}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">相关证据</div>
                <div className="text-xs">{cellDetailData.evidenceIds.join(", ") || "规则推导（无直接证据）"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">建议动作</div>
                <div className="text-primary">{cellDetailData.suggestedAction}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">负责人</div>
                <div>{cellDetailData.owner}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
