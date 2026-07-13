import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowRight, TrendingUp, AlertTriangle, CheckCircle2, FileText, Users, ClipboardCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { riskClass, tierClass, impactColor, impactLabel } from '@/lib/style-helpers';
import { MODULE_LABELS, STATUS_LABELS, EVENT_TYPE_LABELS, type ProductModule } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';

export const Route = createFileRoute('/_authenticated/')({
  component: OverviewPage,
});

const PIPELINE = [
  '信息源接入', '原文采集', '去重清洗', '分类识别', '证据校验', '聚合成情报事件', '判断产品影响', '生成报告与行动建议',
];

const IMPACT_COLS: ProductModule[] = ['search', 'list', 'price', 'form', 'payment', 'order', 'aftersale', 'service'];

function OverviewPage() {
  const navigate = useNavigate();
  const { events } = useStore();
  const [cellDetail, setCellDetail] = useState<{ eventId: string; module: ProductModule } | null>(null);

  const highPriority = events.filter((e) => e.riskLevel === 'P1' || e.riskLevel === 'P2');
  const cellDetailData = cellDetail
    ? events.find((e) => e.eventId === cellDetail.eventId)?.productImpact.find((p) => p.module === cellDetail.module)
    : null;
  const cellDetailEvent = cellDetail ? events.find((e) => e.eventId === cellDetail.eventId) : null;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">情报总览</h2>
        <p className="text-sm text-muted-foreground mt-1">今日一句话结论 · 高优先级事件 · 产品影响预览</p>
      </div>

      {/* Pipeline */}
      <Card className="p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">情报生产链路</div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {PIPELINE.map((step, i) => (
            <div key={step} className="flex items-center gap-1 shrink-0">
              <div className="px-3 py-1.5 rounded-md bg-primary/8 text-primary text-xs font-medium border border-primary/15">
                {step}
              </div>
              {i < PIPELINE.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: '今日新增原文', value: 26, icon: FileText, tone: 'text-blue-600 bg-blue-50' },
          { label: '去重后有效信息', value: 14, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: '新增情报事件', value: 5, icon: TrendingUp, tone: 'text-primary bg-primary/8' },
          { label: '高优先级事件', value: 2, icon: AlertTriangle, tone: 'text-red-600 bg-red-50' },
          { label: '待人工确认', value: 3, icon: ClipboardCheck, tone: 'text-amber-600 bg-amber-50' },
          { label: '已生成报告', value: 1, icon: Users, tone: 'text-purple-600 bg-purple-50' },
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

      {/* Today's one-liner conclusion */}
      <Card className="p-5 bg-gradient-to-r from-primary/5 to-transparent border-l-4 border-l-primary">
        <div className="text-xs font-medium text-primary mb-1.5">今日一句话结论</div>
        <div className="text-base font-medium leading-relaxed">
          今日新增 <b className="text-primary">5</b> 个情报事件,其中
          <b className="mx-1">学生票预约购票服务变化</b>和<b className="mx-1">退改签规则用户误解</b>
          为 <span className="text-red-600 font-semibold">P1</span> 优先级,建议进入产品影响评估。
        </div>
      </Card>

      {/* Three category overview */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { title: '政策监管', total: 3, high: 1, key: '学生票预约购票扩大到 30 天', next: '同步客服口径 + 学生专区适配', tone: 'border-t-blue-500' },
          { title: '功能竞品', total: 2, high: 1, key: '携程规则助手能力增强', next: '立项调研规则助手 MVP', tone: 'border-t-emerald-500' },
          { title: '舆论反馈', total: 4, high: 2, key: '退改签手续费误解 + 候补失败吐槽', next: '优先启动退票费预估功能', tone: 'border-t-amber-500' },
        ].map((c) => (
          <Card key={c.title} className={`p-4 border-t-4 ${c.tone}`}>
            <div className="text-sm font-semibold">{c.title}</div>
            <div className="flex gap-4 mt-3">
              <div>
                <div className="text-2xl font-semibold tabular-nums">{c.total}</div>
                <div className="text-[11px] text-muted-foreground">今日新增</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-red-600">{c.high}</div>
                <div className="text-[11px] text-muted-foreground">高风险</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">重点事件</div>
            <div className="text-sm mt-1">{c.key}</div>
            <div className="mt-3 text-xs text-muted-foreground">下一步建议</div>
            <div className="text-sm mt-1 text-primary">{c.next}</div>
          </Card>
        ))}
      </div>

      {/* High priority cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">高优先级事件</h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate({ to: '/events' })}>
            查看全部 →
          </Button>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
          {highPriority.map((e) => {
            const topTier = e.relatedEvidenceIds.length; // simplification
            return (
              <Card
                key={e.eventId}
                className="p-4 cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
                onClick={() => navigate({ to: '/events', search: { open: e.eventId } as never })}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium text-sm leading-tight">{e.title}</div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${riskClass(e.riskLevel)}`}>
                    {e.riskLevel}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2 mb-3">{e.summary}</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="secondary" className="text-[10px]">{EVENT_TYPE_LABELS[e.eventType]}</Badge>
                  <Badge variant="outline" className="text-[10px]">{topTier} 条证据</Badge>
                  <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[e.status]}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground pt-2 border-t">
                  影响: {e.affectedModules.slice(0, 4).map((m) => MODULE_LABELS[m]).join(' · ')}
                </div>
                <div className="text-[11px] text-primary mt-1.5">下一步: {e.recommendedActions[0]}</div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Impact matrix preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">产品影响矩阵预览</h3>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate({ to: '/impact' })}>
            查看完整图谱 →
          </Button>
        </div>
        <Card className="p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left py-2 pr-3 font-normal w-56">事件</th>
                {IMPACT_COLS.map((m) => (
                  <th key={m} className="px-1 py-2 font-normal text-center">{MODULE_LABELS[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {highPriority.map((e) => (
                <tr key={e.eventId} className="border-t">
                  <td className="py-2 pr-3 font-medium truncate">{e.title}</td>
                  {IMPACT_COLS.map((m) => {
                    const p = e.productImpact.find((x) => x.module === m);
                    const lvl = p?.impactLevel ?? 'none';
                    return (
                      <td key={m} className="px-1 py-1 text-center">
                        <button
                          className={`w-full py-1.5 rounded text-[10px] ${impactColor(lvl)} ${lvl !== 'none' ? 'hover:ring-2 hover:ring-primary/30 cursor-pointer' : 'cursor-default'}`}
                          onClick={() => lvl !== 'none' && setCellDetail({ eventId: e.eventId, module: m })}
                          disabled={lvl === 'none'}
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
            <DialogTitle>{cellDetailEvent?.title} · {cellDetailData && MODULE_LABELS[cellDetailData.module]}</DialogTitle>
          </DialogHeader>
          {cellDetailData && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">影响原因</div>
                <div>{cellDetailData.reason}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">相关证据</div>
                <div className="text-xs">{cellDetailData.evidenceIds.join(', ')}</div>
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
