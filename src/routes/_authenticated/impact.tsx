import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { impactColor, impactLabel } from '@/lib/style-helpers';
import { MODULE_LABELS, type ProductModule } from '@/lib/types';

export const Route = createFileRoute('/impact')({
  component: ImpactPage,
});

const COLS: ProductModule[] = ['search', 'list', 'price', 'form', 'payment', 'order', 'aftersale', 'service', 'student_zone', 'child_zone', 'membership', 'intl'];

function ImpactPage() {
  const { events } = useStore();
  const navigate = useNavigate();
  const [cell, setCell] = useState<{ eventId: string; module: ProductModule } | null>(null);

  // Aggregate by module
  const moduleAgg: Record<ProductModule, number> = COLS.reduce((acc, m) => {
    acc[m] = events.filter((e) => e.productImpact.some((p) => p.module === m && p.impactLevel !== 'none')).length;
    return acc;
  }, {} as Record<ProductModule, number>);

  const opportunities = events.map((e) => ({
    eventId: e.eventId,
    title: e.title,
    evidenceCount: e.relatedEvidenceIds.length,
    users: e.affectedUsers,
    risk: e.riskLevel,
    action: e.recommendedActions[0],
    owner: e.owner,
    status: e.status,
  }));

  const cellEvent = cell ? events.find((e) => e.eventId === cell.eventId) : null;
  const cellData = cellEvent?.productImpact.find((p) => p.module === cell?.module);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">产品影响图谱</h2>
        <p className="text-sm text-muted-foreground mt-1">情报事件 × 产品模块 · 把情报转换成产品动作</p>
      </div>

      {/* Matrix */}
      <Card className="p-4 overflow-x-auto">
        <div className="text-sm font-medium mb-3">情报事件 · 产品模块影响矩阵</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-2 pr-3 font-normal w-52">事件</th>
              {COLS.map((m) => (
                <th key={m} className="px-1 py-2 font-normal text-center min-w-[72px]">{MODULE_LABELS[m]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.eventId} className="border-t">
                <td className="py-2 pr-3 font-medium max-w-52 truncate">{e.title}</td>
                {COLS.map((m) => {
                  const p = e.productImpact.find((x) => x.module === m);
                  const lvl = p?.impactLevel ?? 'none';
                  return (
                    <td key={m} className="px-1 py-1 text-center">
                      <button
                        className={`w-full py-1.5 rounded text-[10px] ${impactColor(lvl)} ${lvl !== 'none' ? 'hover:ring-2 hover:ring-primary/30 cursor-pointer' : 'cursor-default'}`}
                        onClick={() => lvl !== 'none' && setCell({ eventId: e.eventId, module: m })}
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

      {/* Module aggregation */}
      <Card className="p-4">
        <div className="text-sm font-medium mb-3">产品模块聚合(受影响事件数)</div>
        <div className="grid grid-cols-6 gap-3">
          {COLS.map((m) => (
            <div key={m} className="p-3 bg-muted/40 rounded text-center">
              <div className="text-xl font-semibold tabular-nums text-primary">{moduleAgg[m]}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{MODULE_LABELS[m]}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Opportunities */}
      <div>
        <div className="text-base font-semibold mb-3">产品机会点</div>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">来源事件</th>
                <th className="text-right px-3 py-2.5 font-medium">证据数</th>
                <th className="text-left px-3 py-2.5 font-medium">影响用户</th>
                <th className="text-left px-3 py-2.5 font-medium">优先级</th>
                <th className="text-left px-3 py-2.5 font-medium">建议下一步</th>
                <th className="text-left px-3 py-2.5 font-medium">负责人</th>
                <th className="text-left px-4 py-2.5 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.eventId} className="border-t hover:bg-muted/20 cursor-pointer"
                  onClick={() => navigate({ to: '/events', search: { open: o.eventId } as never })}>
                  <td className="px-4 py-2.5 font-medium max-w-xs truncate">{o.title}</td>
                  <td className="px-3 py-2.5 text-right">{o.evidenceCount}</td>
                  <td className="px-3 py-2.5 text-xs">{o.users}</td>
                  <td className="px-3 py-2.5"><Badge variant="outline" className="text-[10px]">{o.risk}</Badge></td>
                  <td className="px-3 py-2.5 text-xs text-primary max-w-sm truncate">{o.action}</td>
                  <td className="px-3 py-2.5 text-xs">{o.owner}</td>
                  <td className="px-4 py-2.5 text-xs">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Dialog open={!!cell} onOpenChange={(o) => !o && setCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cellEvent?.title} · {cellData && MODULE_LABELS[cellData.module]}</DialogTitle>
          </DialogHeader>
          {cellData && (
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground mb-1">影响原因</div>
                <div>{cellData.reason}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">相关证据</div>
                <div className="flex flex-wrap gap-1">
                  {cellData.evidenceIds.map((id) => (
                    <button key={id} className="text-xs text-primary hover:underline"
                      onClick={() => { setCell(null); navigate({ to: '/evidence', search: { open: id } as never }); }}>
                      {id}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">建议动作</div>
                <div className="text-primary">{cellData.suggestedAction}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">负责人</div>
                <div>{cellData.owner}</div>
              </div>
              <Button size="sm" className="w-full" onClick={() => { setCell(null); navigate({ to: '/events', search: { open: cell!.eventId } as never }); }}>
                打开事件详情
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
