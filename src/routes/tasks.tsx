import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useStore, store } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CollectionTask } from '@/lib/types';

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

function TasksPage() {
  const { tasks } = useStore();
  const [detail, setDetail] = useState<CollectionTask | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const stats = {
    success: tasks.filter((t) => t.status === 'success').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
    running: tasks.filter((t) => t.status === 'running').length,
    change: tasks.filter((t) => t.foundChange).length,
    evidence: tasks.reduce((n, t) => n + t.generatedEvidenceIds.length, 0),
  };

  const rerun = (id: string) => {
    setBusy(id);
    setTimeout(() => {
      store.rerunTask(id);
      setBusy(null);
      toast.success('任务已重新执行,发现 1 条新证据');
    }, 1000);
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">采集任务</h2>
        <p className="text-sm text-muted-foreground mt-1">今日 12 个采集任务运行结果</p>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '成功', value: stats.success, tone: 'text-emerald-600' },
          { label: '失败', value: stats.failed, tone: 'text-red-600' },
          { label: '运行中', value: stats.running, tone: 'text-blue-600' },
          { label: '发现变化', value: stats.change, tone: 'text-primary' },
          { label: '生成证据', value: stats.evidence, tone: 'text-amber-600' },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className={`text-2xl font-semibold tabular-nums ${s.tone}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">任务名称</th>
              <th className="text-left px-3 py-2.5 font-medium">执行时间</th>
              <th className="text-left px-3 py-2.5 font-medium">状态</th>
              <th className="text-left px-3 py-2.5 font-medium">发现变化</th>
              <th className="text-right px-3 py-2.5 font-medium">原始条数</th>
              <th className="text-right px-3 py-2.5 font-medium">去重后有效</th>
              <th className="text-left px-3 py-2.5 font-medium">错误信息</th>
              <th className="text-right px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.taskId} className="border-t hover:bg-muted/20">
                <td className="px-4 py-2.5 font-medium">{t.taskName}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{t.runTime}</td>
                <td className="px-3 py-2.5">
                  {t.status === 'success' && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> 成功
                    </Badge>
                  )}
                  {t.status === 'failed' && (
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                      <XCircle className="w-3 h-3 mr-1" /> 失败
                    </Badge>
                  )}
                  {t.status === 'running' && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      <Clock className="w-3 h-3 mr-1" /> 运行中
                    </Badge>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {t.foundChange ? <Badge className="text-[10px] bg-amber-100 text-amber-800 border-0">是</Badge> : <span className="text-xs text-muted-foreground">否</span>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{t.rawItemCount}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{t.validItemCount}</td>
                <td className="px-3 py-2.5 text-xs text-red-600 max-w-xs truncate">{t.errorMessage || '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetail(t)}>
                      查看结果
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => rerun(t.taskId)} disabled={busy === t.taskId}>
                      <RefreshCw className={`w-3 h-3 ${busy === t.taskId ? 'animate-spin' : ''}`} /> 重试
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{detail?.taskName} · 采集结果</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-muted/40 rounded">
                  <div className="text-xl font-semibold">{detail.rawItemCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">去重前</div>
                </div>
                <div className="p-3 bg-muted/40 rounded">
                  <div className="text-xl font-semibold text-primary">{detail.validItemCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">去重后有效</div>
                </div>
                <div className="p-3 bg-muted/40 rounded">
                  <div className="text-xl font-semibold text-amber-600">{detail.generatedEvidenceIds.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">生成证据</div>
                </div>
                <div className="p-3 bg-muted/40 rounded">
                  <div className="text-xl font-semibold">{detail.foundChange ? '是' : '否'}</div>
                  <div className="text-xs text-muted-foreground mt-1">发现变化</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">原始采集内容(样例)</div>
                <div className="text-xs bg-muted/40 rounded p-3 space-y-1 font-mono">
                  {Array.from({ length: Math.min(3, detail.rawItemCount) }).map((_, i) => (
                    <div key={i}>· item-{String(i + 1).padStart(3, '0')} 抓取成功,长度 {Math.floor(Math.random() * 2000 + 500)} 字</div>
                  ))}
                  {detail.rawItemCount > 3 && <div className="text-muted-foreground">... 共 {detail.rawItemCount} 条</div>}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">分类结果</div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="secondary">规则变化 · 1</Badge>
                  <Badge variant="secondary">功能更新 · 1</Badge>
                  <Badge variant="secondary">舆情热点 · 1</Badge>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">生成证据</div>
                <div className="text-xs">{detail.generatedEvidenceIds.length > 0 ? detail.generatedEvidenceIds.join(', ') : '未生成证据'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">是否触发情报事件</div>
                <div className="text-xs text-primary">{detail.generatedEvidenceIds.length > 0 ? '是,已进入事件工作台待人工确认' : '否'}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
