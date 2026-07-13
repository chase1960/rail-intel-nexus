import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Camera, RefreshCw, Link2 } from 'lucide-react';
import { MOCK_SOURCES } from '@/lib/sample-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { tierClass, categoryLabel } from '@/lib/style-helpers';
import type { IntelligenceSource } from '@/lib/types';

export const Route = createFileRoute('/sources')({
  component: SourcesPage,
});

function SourcesPage() {
  const [filter, setFilter] = useState<'all' | 'policy' | 'competitor' | 'sentiment'>('all');
  const [detail, setDetail] = useState<IntelligenceSource | null>(null);

  const list = MOCK_SOURCES.filter((s) => filter === 'all' || s.category === filter);

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">信息源管理</h2>
        <p className="text-sm text-muted-foreground mt-1">18 个信息源覆盖政策监管、功能竞品、舆论反馈三类情报</p>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as never)}>
          <TabsList>
            <TabsTrigger value="all">全部 ({MOCK_SOURCES.length})</TabsTrigger>
            <TabsTrigger value="policy">政策监管 (6)</TabsTrigger>
            <TabsTrigger value="competitor">功能竞品 (6)</TabsTrigger>
            <TabsTrigger value="sentiment">舆论反馈 (6)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">来源名称</th>
              <th className="text-left px-3 py-2.5 font-medium">情报类型</th>
              <th className="text-left px-3 py-2.5 font-medium">来源等级</th>
              <th className="text-left px-3 py-2.5 font-medium">官方</th>
              <th className="text-left px-3 py-2.5 font-medium">采集方式</th>
              <th className="text-left px-3 py-2.5 font-medium">采集频率</th>
              <th className="text-left px-3 py-2.5 font-medium">最近采集</th>
              <th className="text-left px-3 py-2.5 font-medium">状态</th>
              <th className="text-left px-3 py-2.5 font-medium">关联事件</th>
              <th className="text-right px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.sourceId} className="border-t hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <button className="font-medium text-left hover:text-primary" onClick={() => setDetail(s)}>
                    {s.name}
                  </button>
                  <div className="text-[11px] text-muted-foreground">{s.sourceType}</div>
                </td>
                <td className="px-3 py-2.5">{categoryLabel(s.category)}</td>
                <td className="px-3 py-2.5">
                  <Badge variant="outline" className={`text-[10px] ${tierClass(s.authorityLevel)}`}>
                    {s.authorityLevel} 级
                  </Badge>
                </td>
                <td className="px-3 py-2.5">{s.isOfficial ? <Badge variant="secondary" className="text-[10px]">官方</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                <td className="px-3 py-2.5 text-xs">{s.collectionMethod}</td>
                <td className="px-3 py-2.5 text-xs">{s.collectionFrequency}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.lastCollectedAt}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center gap-1 text-xs ${s.status === 'active' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {s.status === 'active' ? '运行中' : '暂停'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs">{s.relatedEventCount} 条</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetail(s)}>
                      详情
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="打开原站"
                      onClick={() => window.open(s.sourceUrl, '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="手动采集 Demo"
                      onClick={() => toast.success(`已触发「${s.name}」手动采集,预计 30 秒后完成`)}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge className={`${tierClass(detail.authorityLevel)}`}>{detail.authorityLevel} 级来源</Badge>
                  {detail.isOfficial && <Badge variant="secondary">官方</Badge>}
                  <Badge variant="outline">{categoryLabel(detail.category)}</Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">来源简介</div>
                  <div>{detail.sourceType} · {detail.collectionMethod} · 采集频率 {detail.collectionFrequency}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">官方链接</div>
                  <a href={detail.sourceUrl} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1 text-xs break-all">
                    <Link2 className="w-3 h-3" /> {detail.sourceUrl}
                  </a>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">来源等级说明</div>
                  <div className="text-xs text-muted-foreground">
                    {detail.authorityLevel === 'S' && 'S 级:官方权威源。可作为政策依据,可直接支撑产品决策。'}
                    {detail.authorityLevel === 'A' && 'A 级:平台官方源。可作为规则/功能变更依据,配合 S 级交叉印证。'}
                    {detail.authorityLevel === 'B' && 'B 级:公开用户反馈。仅作产品线索,不能等同于政策事实。'}
                    {detail.authorityLevel === 'C' && 'C 级:投诉与内部反馈。反映真实体验问题,需人工确认。'}
                    {detail.authorityLevel === 'D' && 'D 级:非官方爆料,仅作待确认线索。'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-2">最近 5 次采集</div>
                  <div className="space-y-1.5">
                    {[detail.lastCollectedAt, '2025-07-10 06:00', '2025-07-10 03:00', '2025-07-10 00:00', '2025-07-09 21:00'].map((t, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5">
                        <span className="text-muted-foreground">{t}</span>
                        <span className="text-emerald-600">成功 · {i === 0 ? '发现变化' : '无变化'}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">关联情报事件</div>
                  <div>{detail.relatedEventCount} 条</div>
                </div>
                <div className="pt-3 border-t space-y-2">
                  <div className="text-xs text-muted-foreground">可信说明</div>
                  <div className="text-xs">
                    {detail.isOfficial ? '本来源为官方源,可作为政策/规则依据。' : '本来源为非官方源,信息需与官方源交叉印证后方可作为产品决策依据。'}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(detail.sourceUrl, '_blank')}>
                    <ExternalLink className="w-3.5 h-3.5" /> 打开原站
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => toast('已打开采集快照 (Demo)')}>
                    <Camera className="w-3.5 h-3.5" /> 查看快照
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => toast.success(`已触发「${detail.name}」手动采集`)}>
                    <RefreshCw className="w-3.5 h-3.5" /> 手动采集
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
