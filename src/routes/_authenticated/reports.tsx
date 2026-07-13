import { createFileRoute } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { FileBarChart, Copy, FileSpreadsheet, FileDown, Sparkles } from 'lucide-react';
import { useStore, store } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MOCK_REPORT_TYPES } from '@/lib/sample-data';
import { riskClass, tierClass } from '@/lib/style-helpers';
import { EVENT_TYPE_LABELS, MODULE_LABELS } from '@/lib/types';

export const Route = createFileRoute('/reports')({
  component: ReportsPage,
});

function ReportsPage() {
  const { events, evidence } = useStore();
  const [type, setType] = useState('daily');
  const [opts, setOpts] = useState({
    policy: true, competitor: true, sentiment: true,
    confirmedOnly: false, includeEvidence: true, includeAdvice: true, includePending: true,
  });

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (opts.confirmedOnly && e.status !== 'confirmed') return false;
      if (e.eventType === 'policy_change' && !opts.policy) return false;
      if (e.eventType === 'competitor_feature' && !opts.competitor) return false;
      if ((e.eventType === 'sentiment_hot' || e.eventType === 'complaint_spike') && !opts.sentiment) return false;
      return true;
    });
  }, [events, opts]);

  const policyEvents = filteredEvents.filter((e) => e.eventType === 'policy_change');
  const competitorEvents = filteredEvents.filter((e) => e.eventType === 'competitor_feature');
  const sentimentEvents = filteredEvents.filter((e) => e.eventType === 'sentiment_hot' || e.eventType === 'complaint_spike');

  const generate = () => {
    store.addReport({
      reportId: `rpt-${Date.now()}`,
      reportType: MOCK_REPORT_TYPES.find((r) => r.key === type)?.label ?? '日报',
      dateRange: '2025-07-10',
      includedCategories: [
        ...(opts.policy ? (['policy'] as const) : []),
        ...(opts.competitor ? (['competitor'] as const) : []),
        ...(opts.sentiment ? (['sentiment'] as const) : []),
      ],
      summary: `${filteredEvents.length} 条情报,含高优先级 ${filteredEvents.filter((e) => e.riskLevel === 'P1').length} 条。`,
      eventIds: filteredEvents.map((e) => e.eventId),
      evidenceIds: Array.from(new Set(filteredEvents.flatMap((e) => e.relatedEvidenceIds))),
      generatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    });
    toast.success('报告已生成并保存到历史');
  };

  return (
    <div className="grid grid-cols-[320px_1fr] gap-6 max-w-[1400px]">
      {/* Config */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">报告生成中心</h2>
          <p className="text-sm text-muted-foreground mt-1">配置左侧,右侧实时预览</p>
        </div>

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">报告类型</div>
          <RadioGroup value={type} onValueChange={setType} className="space-y-2">
            {MOCK_REPORT_TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <RadioGroupItem value={t.key} id={t.key} />
                <Label htmlFor={t.key} className="text-sm cursor-pointer">{t.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">内容选项</div>
          <div className="space-y-2">
            {[
              { k: 'policy', label: '包含政策变化' },
              { k: 'competitor', label: '包含竞品功能' },
              { k: 'sentiment', label: '包含舆情' },
              { k: 'confirmedOnly', label: '仅展示已确认事件' },
              { k: 'includeEvidence', label: '包含证据来源' },
              { k: 'includeAdvice', label: '包含产品建议' },
              { k: 'includePending', label: '包含待人工确认事项' },
            ].map((o) => (
              <div key={o.k} className="flex items-center gap-2">
                <Checkbox id={o.k} checked={opts[o.k as keyof typeof opts]} onCheckedChange={(v) => setOpts({ ...opts, [o.k]: !!v })} />
                <Label htmlFor={o.k} className="text-sm cursor-pointer">{o.label}</Label>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-2">
          <Button className="w-full gap-1.5" onClick={generate}>
            <FileBarChart className="w-4 h-4" /> 生成报告
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast.success('报告文本已复制')}>
              <Copy className="w-3.5 h-3.5" /> 复制
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast('已导出汇报摘要 (Demo)')}>
              <Sparkles className="w-3.5 h-3.5" /> 汇报摘要
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast('已导出 Excel (Demo)')}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast('已导出 PDF (Demo)')}>
              <FileDown className="w-3.5 h-3.5" /> PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <Card className="p-8 min-h-[800px]">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center border-b pb-5">
            <div className="text-xs text-muted-foreground mb-1">2025-07-10 · 火车票产品团队</div>
            <h1 className="text-2xl font-bold">火车票情报 {MOCK_REPORT_TYPES.find((r) => r.key === type)?.label ?? '日报'}</h1>
            <div className="text-xs text-muted-foreground mt-2">Train Ticket Intelligence Hub · 覆盖政策 / 竞品 / 舆情</div>
          </div>

          {/* 1. Conclusion */}
          <Section num="1" title="今日一句话结论">
            <div className="bg-primary/5 border-l-4 border-l-primary p-4 rounded">
              今日新增 <b>{filteredEvents.length}</b> 个情报事件,其中
              <b className="mx-1">学生票预约购票服务变化</b>与
              <b className="mx-1">退改签规则用户误解</b>
              为 <b className="text-red-600">P1</b>,建议进入产品影响评估。
            </div>
          </Section>

          {/* 2. Overview */}
          <Section num="2" title="新增情报概览">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '政策监管', v: policyEvents.length, tone: 'text-blue-600' },
                { label: '功能竞品', v: competitorEvents.length, tone: 'text-emerald-600' },
                { label: '舆论反馈', v: sentimentEvents.length, tone: 'text-amber-600' },
              ].map((c) => (
                <div key={c.label} className="p-3 border rounded text-center">
                  <div className={`text-2xl font-semibold ${c.tone}`}>{c.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* 3. High priority warning */}
          <Section num="3" title="高优先级预警">
            <div className="space-y-2">
              {filteredEvents.filter((e) => e.riskLevel === 'P1').map((e) => (
                <div key={e.eventId} className="border-l-4 border-l-red-500 bg-red-50/50 p-3 rounded-r">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-[10px] ${riskClass(e.riskLevel)}`}>{e.riskLevel}</Badge>
                    <div className="font-semibold text-sm">{e.title}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{e.summary}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* 4-6 categories */}
          {opts.policy && (
            <Section num="4" title="政策变化">
              <EventList list={policyEvents} evidence={evidence} showEvidence={opts.includeEvidence} />
            </Section>
          )}
          {opts.competitor && (
            <Section num="5" title="竞品动作">
              <EventList list={competitorEvents} evidence={evidence} showEvidence={opts.includeEvidence} />
            </Section>
          )}
          {opts.sentiment && (
            <Section num="6" title="舆情主题">
              <EventList list={sentimentEvents} evidence={evidence} showEvidence={opts.includeEvidence} />
            </Section>
          )}

          {/* 7. Product impact */}
          <Section num="7" title="产品影响判断">
            <table className="w-full text-xs border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2 font-medium">事件</th>
                  <th className="text-left p-2 font-medium">受影响模块</th>
                  <th className="text-left p-2 font-medium">建议</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((e) => (
                  <tr key={e.eventId} className="border-t">
                    <td className="p-2 font-medium">{e.title}</td>
                    <td className="p-2">{e.affectedModules.map((m) => MODULE_LABELS[m]).join(' · ')}</td>
                    <td className="p-2 text-primary">{e.recommendedActions[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* 8. Actions */}
          {opts.includeAdvice && (
            <Section num="8" title="建议动作">
              <ul className="space-y-1.5 text-sm">
                {filteredEvents.flatMap((e) => e.recommendedActions.slice(0, 1).map((a) => `${e.title}:${a}`)).map((a, i) => (
                  <li key={i} className="flex gap-2"><span className="text-primary">·</span> <span>{a}</span></li>
                ))}
              </ul>
            </Section>
          )}

          {/* 9. Pending */}
          {opts.includePending && (
            <Section num="9" title="待人工确认事项">
              <div className="text-sm space-y-1.5">
                {filteredEvents.filter((e) => !e.confidenceLevel.humanReviewed).map((e) => (
                  <div key={e.eventId} className="flex gap-2">
                    <span className="text-amber-600">·</span> {e.title}({EVENT_TYPE_LABELS[e.eventType]})
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 10. Sources */}
          {opts.includeEvidence && (
            <Section num="10" title="证据来源">
              <div className="text-xs space-y-1.5">
                {evidence.filter((v) => filteredEvents.some((e) => e.relatedEvidenceIds.includes(v.evidenceId))).map((v) => (
                  <div key={v.evidenceId} className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${tierClass(v.authorityLevel)}`}>{v.authorityLevel}</Badge>
                    <span className="text-muted-foreground">{v.sourceName}</span>
                    <span className="truncate">{v.title}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <div className="text-center text-[11px] text-muted-foreground pt-6 border-t">
            报告由火车票情报中台生成 · Demo 数据 · 生成时间 2025-07-10
          </div>
        </div>
      </Card>
    </div>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3 pb-1.5 border-b">
        <span className="w-6 h-6 rounded bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">{num}</span>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function EventList({ list, evidence, showEvidence }: { list: ReturnType<typeof useStore>['events']; evidence: ReturnType<typeof useStore>['evidence']; showEvidence: boolean }) {
  if (list.length === 0) return <div className="text-xs text-muted-foreground">无</div>;
  return (
    <div className="space-y-3">
      {list.map((e) => (
        <div key={e.eventId} className="p-3 border rounded">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge className={`text-[10px] ${riskClass(e.riskLevel)}`}>{e.riskLevel}</Badge>
            <div className="font-medium text-sm">{e.title}</div>
          </div>
          <div className="text-xs text-muted-foreground mb-2">{e.summary}</div>
          {showEvidence && (
            <div className="text-[11px] text-muted-foreground">
              证据: {e.relatedEvidenceIds.map((id) => evidence.find((v) => v.evidenceId === id)?.sourceName).filter(Boolean).join(' / ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
