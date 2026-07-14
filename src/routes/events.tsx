import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { ExternalLink, ShieldCheck, ShieldAlert, Sparkles, Save } from 'lucide-react';
import { useStore, store } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { riskClass, statusClass, tierClass, impactColor, impactLabel } from '@/lib/style-helpers';
import { MODULE_LABELS, STATUS_LABELS, EVENT_TYPE_LABELS, type IntelligenceEvent, type EventStatus, type RiskLevel } from '@/lib/types';

interface Search {
  open?: string;
}

export const Route = createFileRoute('/events')({
  validateSearch: (s: Record<string, unknown>): Search => ({ open: s.open as string | undefined }),
  component: EventsPage,
});

function EventsPage() {
  const { events, evidence } = useStore();
  const search = useSearch({ from: '/events' });
  const navigate = useNavigate();
  const [detail, setDetail] = useState<IntelligenceEvent | null>(null);

  useEffect(() => {
    if (search.open) {
      const e = events.find((x) => x.eventId === search.open);
      if (e) setDetail(e);
    }
  }, [search.open, events]);

  const closeDetail = () => {
    setDetail(null);
    if (search.open) navigate({ to: '/events', search: {} });
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">情报事件工作台</h2>
        <p className="text-sm text-muted-foreground mt-1">多条信息聚合成的情报事件 · 可编辑 · 可行动</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">事件</th>
              <th className="text-left px-3 py-2.5 font-medium">类型</th>
              <th className="text-left px-3 py-2.5 font-medium">影响人群</th>
              <th className="text-right px-3 py-2.5 font-medium">来源数</th>
              <th className="text-left px-3 py-2.5 font-medium">最高等级</th>
              <th className="text-left px-3 py-2.5 font-medium">情绪</th>
              <th className="text-left px-3 py-2.5 font-medium">风险</th>
              <th className="text-left px-3 py-2.5 font-medium">状态</th>
              <th className="text-left px-3 py-2.5 font-medium">负责人</th>
              <th className="text-left px-4 py-2.5 font-medium">下一步</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const topTier = e.relatedEvidenceIds
                .map((id) => evidence.find((v) => v.evidenceId === id)?.authorityLevel ?? 'D')
                .sort()[0] ?? 'D';
              return (
                <tr key={e.eventId} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setDetail(e)}>
                  <td className="px-4 py-2.5 font-medium max-w-xs truncate">{e.title}</td>
                  <td className="px-3 py-2.5"><Badge variant="secondary" className="text-[10px]">{EVENT_TYPE_LABELS[e.eventType]}</Badge></td>
                  <td className="px-3 py-2.5 text-xs">{e.affectedUsers}</td>
                  <td className="px-3 py-2.5 text-right text-xs">{e.relatedEvidenceIds.length}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={`text-[10px] ${tierClass(topTier as never)}`}>{topTier}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {e.sentiment === 'negative' && <span className="text-red-600">负面</span>}
                    {e.sentiment === 'positive' && <span className="text-emerald-600">正面</span>}
                    {e.sentiment === 'neutral' && <span className="text-muted-foreground">中性</span>}
                    {e.sentiment === 'mixed' && <span className="text-amber-600">混合</span>}
                  </td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className={`text-[10px] ${riskClass(e.riskLevel)}`}>{e.riskLevel}</Badge></td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className={`text-[10px] ${statusClass(e.status)}`}>{STATUS_LABELS[e.status]}</Badge></td>
                  <td className="px-3 py-2.5 text-xs">{e.owner}</td>
                  <td className="px-4 py-2.5 text-xs text-primary max-w-xs truncate">{e.recommendedActions[0]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && closeDetail()}>
        <SheetContent className="w-[720px] sm:max-w-[720px] overflow-y-auto p-0">
          {detail && <EventDetail event={detail} onClose={closeDetail} />}
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
    note: '',
  });

  const relatedEvidence = event.relatedEvidenceIds.map((id) => evidence.find((v) => v.evidenceId === id)!).filter(Boolean);

  const save = () => {
    store.updateEvent(event.eventId, {
      riskLevel: draft.riskLevel,
      status: draft.status,
      owner: draft.owner,
    });
    toast.success('人工审核已保存');
    onClose();
  };

  return (
    <div>
      <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-card z-10">
        <SheetTitle className="text-base leading-snug">{event.title}</SheetTitle>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="secondary" className="text-[10px]">{EVENT_TYPE_LABELS[event.eventType]}</Badge>
          <Badge variant="outline" className={`text-[10px] ${riskClass(event.riskLevel)}`}>{event.riskLevel}</Badge>
          <Badge variant="outline" className={`text-[10px] ${statusClass(event.status)}`}>{STATUS_LABELS[event.status]}</Badge>
        </div>
      </SheetHeader>

      <div className="p-6 space-y-6 text-sm">
        {/* Summary */}
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">事件摘要</div>
          <div className="leading-relaxed">{event.summary}</div>
        </div>

        {/* Evidence timeline */}
        <div>
          <div className="text-xs text-muted-foreground mb-3">证据链时间线({relatedEvidence.length} 条)</div>
          <div className="space-y-2 pl-4 border-l-2 border-primary/20">
            {relatedEvidence.map((ev) => (
              <div key={ev.evidenceId} className="relative">
                <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-primary/20 border-2 border-card" />
                <Card className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground mb-1">{ev.publishedAt} · {ev.sourceName}</div>
                      <div className="font-medium text-sm">{ev.title}</div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${tierClass(ev.authorityLevel)}`}>{ev.authorityLevel}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{ev.summary}</div>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1 px-2"
                      onClick={() => navigate({ to: '/evidence', search: { open: ev.evidenceId } as never })}>
                      查看证据
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1 px-2"
                      onClick={() => window.open(ev.originalUrl, '_blank')}>
                      <ExternalLink className="w-3 h-3" /> 打开原文
                    </Button>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* AI integration result */}
        <div className="bg-primary/5 border border-primary/15 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI 整合结果(仅用于聚合与判断,不做结论)</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">事件类型:</span> {EVENT_TYPE_LABELS[event.eventType]}</div>
            <div><span className="text-muted-foreground">影响用户:</span> {event.affectedUsers}</div>
            <div className="col-span-2"><span className="text-muted-foreground">影响范围:</span> {event.affectedModules.map((m) => MODULE_LABELS[m]).join(' · ')}</div>
            <div className="col-span-2"><span className="text-muted-foreground">主要变化:</span> {event.summary}</div>
            <div className="col-span-2"><span className="text-muted-foreground">来源综述:</span> {event.sourceSummary}</div>
          </div>
        </div>

        {/* Confidence check */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> 准确性校验
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: '有官方来源', ok: event.confidenceLevel.hasOfficialSource },
              { label: '多源佐证', ok: event.confidenceLevel.multiSourceCorroborated },
              { label: '有原文链接', ok: event.confidenceLevel.hasOriginalUrl },
              { label: '有原文快照', ok: event.confidenceLevel.hasSnapshot },
              { label: '存在矛盾', ok: !event.confidenceLevel.hasConflict, text: event.confidenceLevel.hasConflict ? '是' : '否' },
              { label: '人工已确认', ok: event.confidenceLevel.humanReviewed },
            ].map((c) => (
              <div key={c.label} className={`flex items-center gap-2 px-2.5 py-1.5 rounded border ${c.ok ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700' : 'bg-amber-50/50 border-amber-200 text-amber-700'}`}>
                {c.ok ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {c.label}: {c.text ?? (c.ok ? '是' : '待确认')}
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs bg-blue-50 text-blue-900 p-2.5 rounded border border-blue-200">
            当前可信状态:{event.confidenceLevel.hasOfficialSource && event.confidenceLevel.multiSourceCorroborated
              ? '✅ 官方来源 + 多源印证,可以支撑产品决策。'
              : event.confidenceLevel.multiSourceCorroborated
                ? '⚠️ 多源印证但无官方来源,仅可作为产品线索,不能作为政策事实。'
                : '⚠️ 单源信息,建议等待官方来源印证。'}
          </div>
        </div>

        {/* Product impact */}
        <div>
          <div className="text-xs text-muted-foreground mb-2">产品影响判断</div>
          <div className="space-y-2">
            {event.productImpact.map((p) => (
              <div key={p.module} className="flex items-start gap-3 p-3 border rounded">
                <Badge className={`text-[10px] shrink-0 ${impactColor(p.impactLevel)} border-0`}>{impactLabel(p.impactLevel)}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{MODULE_LABELS[p.module]}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.reason}</div>
                  <div className="text-xs text-primary mt-1">建议: {p.suggestedAction} · 负责人: {p.owner}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
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

        {/* Human edit */}
        <div className="border-t pt-5">
          <div className="text-sm font-medium mb-3">人工编辑</div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">风险等级</div>
              <Select value={draft.riskLevel} onValueChange={(v) => setDraft({ ...draft, riskLevel: v as RiskLevel })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
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
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">负责人</div>
              <Input className="h-8 text-xs" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">备注</div>
            <Textarea className="text-xs min-h-16" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="记录你的判断..." />
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={save} className="gap-1.5">
              <Save className="w-3.5 h-3.5" /> 保存审核
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              store.updateEvent(event.eventId, { status: 'confirmed' });
              toast.success('已标记为已确认'); onClose();
            }}>标记已确认</Button>
            <Button size="sm" variant="outline" onClick={() => {
              store.updateEvent(event.eventId, { status: 'lead' });
              toast.success('已标记为线索'); onClose();
            }}>标记线索</Button>
            <Button size="sm" variant="ghost" onClick={() => {
              store.updateEvent(event.eventId, { status: 'watching' });
              toast('已改为持续观察'); onClose();
            }}>无需处理</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
