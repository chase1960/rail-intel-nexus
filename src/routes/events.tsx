import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ExternalLink, ShieldCheck, ShieldAlert, Sparkles, Save, ThumbsUp, ThumbsDown, TrendingUp, TrendingDown } from "lucide-react";
import { useStore, store } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { riskClass, statusClass, tierClass, impactColor, impactLabel, categoryLabel } from "@/lib/style-helpers";
import {
  MODULE_LABELS,
  STATUS_LABELS,
  EVENT_TYPE_LABELS,
  type IntelligenceEvent,
  type EventStatus,
  type RiskLevel,
} from "@/lib/types";
import { formatDateTime } from "@/lib/engine/dates";

interface Search {
  open?: string;
}

export const Route = createFileRoute("/events")({
  validateSearch: (s: Record<string, unknown>): Search => ({ open: s.open as string | undefined }),
  component: EventsPage,
});

const RELATION_LABEL: Record<string, string> = {
  before: "前序",
  trigger: "触发",
  after: "后续",
  context: "背景",
  conflict: "冲突",
};

function EventsPage() {
  const { events, evidence } = useStore();
  const search = useSearch({ from: "/events" });
  const navigate = useNavigate();
  const [detailId, setDetailId] = useState<string | null>(search.open ?? null);

  useEffect(() => {
    if (search.open) setDetailId(search.open);
  }, [search.open]);

  const detail = detailId ? events.find((e) => e.eventId === detailId) ?? null : null;

  const closeDetail = () => {
    setDetailId(null);
    if (search.open) navigate({ to: "/events", search: {} });
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">情报事件工作台</h2>
        <p className="text-sm text-muted-foreground mt-1">
          事件由证据聚合而成｜每条事件都带评分、参考意见、证伪条件与人工反馈入口
        </p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">事件</th>
              <th className="text-left px-3 py-2.5 font-medium">类型</th>
              <th className="text-right px-3 py-2.5 font-medium">证据 / 源</th>
              <th className="text-right px-3 py-2.5 font-medium">置信度</th>
              <th className="text-left px-3 py-2.5 font-medium">风险</th>
              <th className="text-left px-3 py-2.5 font-medium">状态</th>
              <th className="text-left px-3 py-2.5 font-medium">立场</th>
              <th className="text-left px-3 py-2.5 font-medium">负责人</th>
              <th className="text-left px-4 py-2.5 font-medium">下一步</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.eventId} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setDetailId(e.eventId)}>
                <td className="px-4 py-2.5 font-medium max-w-xs truncate">{e.title}</td>
                <td className="px-3 py-2.5">
                  <Badge variant="secondary" className="text-[10px]">
                    {EVENT_TYPE_LABELS[e.eventType]}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                  {e.evidenceCount} / {e.distinctSourceCount}
                </td>
                <td className="px-3 py-2.5 text-right text-xs tabular-nums">{e.confidence}%</td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className={`text-[10px] ${riskClass(e.riskLevel)}`}>
                    {e.riskLevel}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className={`text-[10px] ${statusClass(e.status)}`}>
                    {STATUS_LABELS[e.status]}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {e.opinion?.stance === "act" ? (
                    <span className="text-red-600">可行动</span>
                  ) : e.opinion?.stance === "watch" ? (
                    <span className="text-amber-600">先观察</span>
                  ) : (
                    <span className="text-slate-500">暂缓</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs">{e.owner}</td>
                <td className="px-4 py-2.5 text-xs text-primary max-w-xs truncate">{e.recommendedActions[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent className="w-[760px] sm:max-w-[760px] overflow-y-auto p-0">
          {detail && <EventDetail key={detail.eventId} event={detail} onClose={closeDetail} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EventDetail({ event, onClose }: { event: IntelligenceEvent; onClose: () => void }) {
  const { evidence } = useStore();
  const navigate = useNavigate();
  const [draft, setDraft] = useState({
    riskLevel: event.riskLevel,
    status: event.status,
    owner: event.owner,
    note: event.reviewNote ?? "",
  });
  const [decisionReason, setDecisionReason] = useState("");

  const relatedEvidence = event.relatedEvidenceIds
    .map((id) => evidence.find((v) => v.evidenceId === id))
    .filter((v): v is NonNullable<typeof v> => !!v);

  const bestEvidence = relatedEvidence.reduce<(typeof relatedEvidence)[number] | null>(
    (best, cur) => (!best || (cur.score?.total ?? 0) > (best.score?.total ?? 0) ? cur : best),
    null,
  );

  const save = () => {
    store.updateEvent(event.eventId, {
      riskLevel: draft.riskLevel,
      status: draft.status,
      owner: draft.owner,
    });
    store.saveReviewNote(event.eventId, draft.note);
    toast.success("人工审核已保存（备注已写入 review_note）");
    onClose();
  };

  const feedback = (decision: "confirm" | "reject" | "promote" | "demote") => {
    store.submitFeedback({
      eventId: event.eventId,
      decision,
      reason: decisionReason || draft.note || "（无备注）",
    });
    toast.success(`已提交「${decision}」：源先验与关键词权重已更新，流水线已按新记忆重跑`);
    onClose();
  };

  return (
    <div>
      <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-card z-10">
        <SheetTitle className="text-base leading-snug">{event.title}</SheetTitle>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="secondary" className="text-[10px]">
            {EVENT_TYPE_LABELS[event.eventType]}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${riskClass(event.riskLevel)}`}>
            {event.riskLevel}
          </Badge>
          <Badge variant="outline" className={`text-[10px] ${statusClass(event.status)}`}>
            {STATUS_LABELS[event.status]}
          </Badge>
          <Badge variant="outline" className="text-[10px]">置信度 {event.confidence}%</Badge>
          <Badge variant="outline" className="text-[10px]">主题 {event.clusterKey}</Badge>
          {(event.precedentEventIds?.length ?? 0) > 0 && (
            <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
              参考 {event.precedentEventIds?.length} 个历史先例
            </Badge>
          )}
        </div>
      </SheetHeader>

      <div className="p-6 space-y-6 text-sm">
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">事件摘要</div>
          <div className="leading-relaxed">{event.summary}</div>
        </div>

        {/* Reference opinion */}
        {event.opinion && (
          <div className="bg-primary/5 border border-primary/15 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">参考意见（不是结论）</span>
              <Badge variant="outline" className="text-[10px] ml-auto">
                {event.opinion.stance === "act" ? "可行动" : event.opinion.stance === "watch" ? "先观察" : "暂缓"} · 置信{" "}
                {event.opinion.confidence}%
              </Badge>
            </div>
            <div className="text-sm font-medium mb-3">{event.opinion.headline}</div>
            <div className="text-[11px] text-muted-foreground mb-1">依据</div>
            <ul className="space-y-1 text-xs">
              {event.opinion.reasoning.map((r, i) => (
                <li key={i}>· {r}</li>
              ))}
            </ul>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="bg-card border rounded p-2.5">
                <div className="text-[11px] text-muted-foreground mb-1">什么情况下这个判断会被推翻</div>
                <ul className="space-y-1 text-[11px]">
                  {event.opinion.falsifiers.map((f, i) => (
                    <li key={i}>· {f}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-card border rounded p-2.5">
                <div className="text-[11px] text-muted-foreground mb-1">30 分钟内可完成的验证</div>
                <ol className="space-y-1 text-[11px]">
                  {event.opinion.verificationSteps.map((s, i) => (
                    <li key={i}>
                      {i + 1}. {s}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
              观察指标：{event.opinion.watchMetrics.join("；")}
            </div>
            <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
              使用边界：{event.opinion.usageBoundary}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <div className="text-xs text-muted-foreground mb-3">
            证据时间线（{relatedEvidence.length} 条 · {event.publishedTimeStart?.slice(0, 16)} → {event.publishedTimeEnd?.slice(0, 16)}）
          </div>
          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
            {(event.timeline ?? []).map((point) => {
              const ev = evidence.find((x) => x.evidenceId === point.evidenceId);
              return (
                <div key={`${point.evidenceId}-${point.at}`} className="relative">
                  <div
                    className={`absolute -left-[21px] top-2 w-3 h-3 rounded-full border-2 border-card ${
                      point.relation === "conflict"
                        ? "bg-rose-400"
                        : point.relation === "trigger"
                          ? "bg-primary"
                          : "bg-primary/25"
                    }`}
                  />
                  <Card className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">
                          {formatDateTime(point.at)} · {point.sourceName} · {RELATION_LABEL[point.relation]}
                        </div>
                        <div className="font-medium text-sm">{point.label}</div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${tierClass(point.authorityLevel)}`}>
                        {point.authorityLevel}
                      </Badge>
                    </div>
                    {ev && (
                      <>
                        <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{ev.summary}</div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(ev.score?.dimensions ?? []).slice(0, 5).map((d) => (
                            <span key={d.key} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {d.label} {d.points}
                            </span>
                          ))}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            总分 {ev.score?.total}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[11px] gap-1 px-2"
                            onClick={() => navigate({ to: "/evidence", search: { open: ev.evidenceId } as never })}
                          >
                            查看证据
                          </Button>
                          {/^https?:\/\//i.test(ev.originalUrl) ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[11px] gap-1 px-2"
                              onClick={() => window.open(ev.originalUrl, "_blank")}
                            >
                              <ExternalLink className="w-3 h-3" /> 打开原文
                            </Button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground self-center">内部源，无公网原文</span>
                          )}
                        </div>
                      </>
                    )}
                  </Card>
                </div>
              );
            })}
          </div>
          {event.conflicts && event.conflicts.length > 0 && (
            <div className="mt-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded p-2.5">
              <b>冲突标记（不进入结论）：</b>
              <ul className="mt-1 space-y-0.5">
                {event.conflicts.map((c) => (
                  <li key={c.evidenceId}>· {c.note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confidence */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> 准确性校验
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "有官方来源", ok: event.confidenceLevel.hasOfficialSource },
              { label: "多源佐证", ok: event.confidenceLevel.multiSourceCorroborated },
              { label: "有原文链接", ok: event.confidenceLevel.hasOriginalUrl },
              { label: "有原文快照", ok: event.confidenceLevel.hasSnapshot },
              {
                label: "存在矛盾",
                ok: !event.confidenceLevel.hasConflict,
                text: event.confidenceLevel.hasConflict ? "是（已隔离）" : "否",
              },
              { label: "人工已确认", ok: event.confidenceLevel.humanReviewed },
            ].map((c) => (
              <div
                key={c.label}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${
                  c.ok
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-700"
                    : "bg-amber-50/50 border-amber-200 text-amber-700"
                }`}
              >
                {c.ok ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {c.label}: {c.text ?? (c.ok ? "是" : "待确认")}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs bg-blue-50 text-blue-900 p-2.5 rounded border border-blue-200">
            {event.confidenceLevel.hasOfficialSource && event.confidenceLevel.multiSourceCorroborated
              ? "官方来源 + 多源印证，可支撑产品决策。"
              : event.confidenceLevel.multiSourceCorroborated
                ? "多源印证但无官方来源，只能作为产品线索，不能当政策事实。"
                : "单源信息，建议等官方或第二来源印证后再投入。"}
          </div>
        </div>

        {/* Score breakdown of best evidence */}
        {bestEvidence?.score && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">最高分证据的评分拆解（{bestEvidence.title}）</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="text-left py-1.5 font-normal">维度</th>
                  <th className="text-right py-1.5 font-normal">权重</th>
                  <th className="text-right py-1.5 font-normal">归一值</th>
                  <th className="text-right py-1.5 font-normal">得分</th>
                  <th className="text-left py-1.5 pl-3 font-normal">说明</th>
                </tr>
              </thead>
              <tbody>
                {bestEvidence.score.dimensions.map((d) => (
                  <tr key={d.key} className="border-t">
                    <td className="py-1.5">{d.label}</td>
                    <td className="py-1.5 text-right tabular-nums">{(d.weight * 100).toFixed(0)}%</td>
                    <td className="py-1.5 text-right tabular-nums">{d.value.toFixed(2)}</td>
                    <td className="py-1.5 text-right tabular-nums">{d.points}</td>
                    <td className="py-1.5 pl-3 text-muted-foreground">{d.note}</td>
                  </tr>
                ))}
                <tr className="border-t font-medium">
                  <td className="py-1.5">冲突扣分 / 总分</td>
                  <td className="py-1.5 text-right">—</td>
                  <td className="py-1.5 text-right">—</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {bestEvidence.score.conflictPenalty > 0 ? `-${bestEvidence.score.conflictPenalty}` : "0"} /{" "}
                    {bestEvidence.score.total}
                  </td>
                  <td className="py-1.5 pl-3 text-muted-foreground">等级 {bestEvidence.score.grade}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Impact */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">产品影响判断（规则推导）</div>
          <div className="space-y-2">
            {event.productImpact.map((p) => (
              <div key={p.module} className="flex items-start gap-3 p-3 border rounded">
                <Badge className={`text-[10px] shrink-0 ${impactColor(p.impactLevel)} border-0`}>
                  {impactLabel(p.impactLevel)}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{MODULE_LABELS[p.module]}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.reason}</div>
                  <div className="text-xs text-primary mt-1">
                    建议：{p.suggestedAction} · 负责人：{p.owner} · 规则 {p.ruleId}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-2">行动建议</div>
          <ul className="space-y-1 text-sm">
            {event.recommendedActions.map((a, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary">·</span> <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Human feedback loop */}
        <div className="border-t pt-5">
          <div className="text-sm font-medium mb-1">人工判断（写入记忆，影响下一轮）</div>
          <div className="text-[11px] text-muted-foreground mb-3">
            确认 = 该主题同类信号以后默认可信；驳回 = 降低相关源与关键词权重。同一事件第 2 次确认会生成一条学习型 playbook 规则。
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">风险等级</div>
              <Select value={draft.riskLevel} onValueChange={(v) => setDraft({ ...draft, riskLevel: v as RiskLevel })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                  <SelectItem value="P3">P3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">状态</div>
              <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as EventStatus })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">负责人</div>
              <Input className="h-8 text-xs" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">备注（写入 review_note）</div>
            <Textarea
              className="text-xs min-h-16"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="记录你的判断依据、你核对过的原文…"
            />
          </div>
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">反馈原因（用于审计）</div>
            <Input
              className="h-8 text-xs"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="例如：已核对 12306 原文，数字一致"
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" onClick={save} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> 保存审核
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => feedback("confirm")}>
              <ThumbsUp className="w-3.5 h-3.5" /> 确认可信
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => feedback("reject")}>
              <ThumbsDown className="w-3.5 h-3.5" /> 驳回
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => feedback("promote")}>
              <TrendingUp className="w-3.5 h-3.5" /> 提升优先级
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => feedback("demote")}>
              <TrendingDown className="w-3.5 h-3.5" /> 降低优先级
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                store.updateEvent(event.eventId, { status: "watching" });
                toast("已改为持续观察");
                onClose();
              }}
            >
              仅观察
            </Button>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            分类：{relatedEvidence[0] ? categoryLabel(relatedEvidence[0].category) : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
