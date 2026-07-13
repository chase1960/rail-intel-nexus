import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, RefreshCw, Plus, Trash2, PlugZap } from 'lucide-react';
import { listSources, upsertSource, deleteSource, testSourceConnection, listCollectionRuns } from '@/lib/sources.functions';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const Route = createFileRoute('/_authenticated/sources')({
  component: SourcesPage,
});

const CATEGORY_LABEL: Record<string, string> = { policy: '政策监管', competitor: '功能竞品', sentiment: '舆论反馈' };
const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  unconfigured: { label: '未配置', color: 'text-slate-500' },
  testing: { label: '测试中', color: 'text-blue-600' },
  connected: { label: '已连接', color: 'text-emerald-600' },
  degraded: { label: '部分可用', color: 'text-amber-600' },
  auth_required: { label: '需要 API 授权', color: 'text-orange-600' },
  login_required: { label: '需要平台登录', color: 'text-orange-600' },
  blocked: { label: '平台阻断', color: 'text-red-600' },
  failed: { label: '连接失败', color: 'text-red-600' },
  disabled: { label: '已停用', color: 'text-slate-400' },
};
const ACCESS_MODES = [
  ['public_web', '公开网页'], ['public_api', '公开 API'], ['oauth_api', 'OAuth API'],
  ['login_manual', '登录源人工取证'], ['internal_connector', '内部连接器'],
  ['file_import', '文件导入'], ['external_collection_service', '外部采集服务'],
] as const;

function SourcesPage() {
  const [filter, setFilter] = useState<'all' | 'policy' | 'competitor' | 'sentiment'>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  const list = useServerFn(listSources);
  const test = useServerFn(testSourceConnection);
  const upsert = useServerFn(upsertSource);
  const del = useServerFn(deleteSource);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['sources'],
    queryFn: () => list(),
  });

  const testMut = useMutation({
    mutationFn: (id: string) => test({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`测试完成：${STATUS_LABEL[r.status]?.label ?? r.status}${r.httpStatus ? ` · HTTP ${r.httpStatus}` : ''}${r.errorMessage ? ` · ${r.errorMessage}` : ''}`);
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { toast.success('已删除'); qc.invalidateQueries({ queryKey: ['sources'] }); setDetailId(null); },
  });

  const filtered = sources.filter((s) => filter === 'all' || s.category === filter);
  const detail = sources.find((s) => s.id === detailId) ?? null;

  const counts = {
    all: sources.length,
    policy: sources.filter((s) => s.category === 'policy').length,
    competitor: sources.filter((s) => s.category === 'competitor').length,
    sentiment: sources.filter((s) => s.category === 'sentiment').length,
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">信息源管理</h2>
          <p className="text-sm text-muted-foreground mt-1">共 {sources.length} 个信息源。真实连接状态与最近测试记录来自 collection_runs。</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5"><Plus className="w-4 h-4" />新建信息源</Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as never)}>
        <TabsList>
          <TabsTrigger value="all">全部 ({counts.all})</TabsTrigger>
          <TabsTrigger value="policy">政策监管 ({counts.policy})</TabsTrigger>
          <TabsTrigger value="competitor">功能竞品 ({counts.competitor})</TabsTrigger>
          <TabsTrigger value="sentiment">舆论反馈 ({counts.sentiment})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">来源名称</th>
              <th className="text-left px-3 py-2.5 font-medium">类型</th>
              <th className="text-left px-3 py-2.5 font-medium">来源等级</th>
              <th className="text-left px-3 py-2.5 font-medium">接入模式</th>
              <th className="text-left px-3 py-2.5 font-medium">连接状态</th>
              <th className="text-left px-3 py-2.5 font-medium">最近测试</th>
              <th className="text-left px-3 py-2.5 font-medium">最近错误</th>
              <th className="text-right px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">加载中…</td></tr>}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                当前时间范围内无信息源。点击右上角「新建信息源」录入首个来源，或到「系统接入状态」查看内建示例来源列表。
              </td></tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-2.5">
                  <button className="font-medium text-left hover:text-primary" onClick={() => setDetailId(s.id)}>{s.name}</button>
                  <div className="text-[11px] text-muted-foreground">{s.source_type ?? '-'}</div>
                </td>
                <td className="px-3 py-2.5">{CATEGORY_LABEL[s.category]}</td>
                <td className="px-3 py-2.5"><Badge variant="outline" className="text-[10px]">{s.authority_level} 级{s.is_official ? ' · 官方' : ''}</Badge></td>
                <td className="px-3 py-2.5 text-xs">{ACCESS_MODES.find(([v]) => v === s.access_mode)?.[1] ?? s.access_mode}</td>
                <td className={`px-3 py-2.5 text-xs ${STATUS_LABEL[s.connection_status]?.color ?? ''}`}>
                  <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-current" />{STATUS_LABEL[s.connection_status]?.label ?? s.connection_status}</span>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{s.last_tested_at ? new Date(s.last_tested_at).toLocaleString('zh-CN') : '—'}</td>
                <td className="px-3 py-2.5 text-xs text-red-600 max-w-[220px] truncate" title={s.last_error_message ?? ''}>{s.last_error_message ?? '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetailId(s.id)}>详情</Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="打开原站" onClick={() => window.open(s.source_url, '_blank')}><ExternalLink className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="测试连接"
                      disabled={testMut.isPending && testMut.variables === s.id}
                      onClick={() => testMut.mutate(s.id)}>
                      <PlugZap className={`w-3.5 h-3.5 ${testMut.isPending && testMut.variables === s.id ? 'animate-pulse' : ''}`} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <SourceDetail sourceId={detailId} source={detail} open={!!detailId} onClose={() => setDetailId(null)}
        onDelete={(id) => delMut.mutate(id)}
        onTest={(id) => testMut.mutate(id)}
        testing={testMut.isPending}
      />

      {creating && (
        <SourceEditor
          onClose={() => setCreating(false)}
          onSave={async (values) => {
            await upsert({ data: values });
            toast.success('已创建');
            qc.invalidateQueries({ queryKey: ['sources'] });
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

type SourceRow = Awaited<ReturnType<typeof listSources>>[number];

function SourceDetail({ sourceId, source, open, onClose, onDelete, onTest, testing }: {
  sourceId: string | null; source: SourceRow | null; open: boolean; onClose: () => void;
  onDelete: (id: string) => void; onTest: (id: string) => void; testing: boolean;
}) {
  const listRuns = useServerFn(listCollectionRuns);
  const { data: runs = [] } = useQuery({
    queryKey: ['runs', sourceId],
    queryFn: () => listRuns({ data: { sourceId: sourceId!, limit: 10 } }),
    enabled: !!sourceId,
  });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        {source && (
          <>
            <SheetHeader><SheetTitle>{source.name}</SheetTitle></SheetHeader>
            <div className="mt-5 space-y-5 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{source.authority_level} 级</Badge>
                {source.is_official && <Badge variant="secondary">官方</Badge>}
                <Badge variant="outline">{CATEGORY_LABEL[source.category]}</Badge>
                <Badge variant="outline">{ACCESS_MODES.find(([v]) => v === source.access_mode)?.[1]}</Badge>
                <Badge className={STATUS_LABEL[source.connection_status]?.color}>{STATUS_LABEL[source.connection_status]?.label}</Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">URL</div>
                <a href={source.source_url} target="_blank" rel="noreferrer" className="text-primary text-xs break-all inline-flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />{source.source_url}
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><div className="text-muted-foreground">最近测试</div><div>{source.last_tested_at ? new Date(source.last_tested_at).toLocaleString('zh-CN') : '从未测试'}</div></div>
                <div><div className="text-muted-foreground">最近成功</div><div>{source.last_success_at ? new Date(source.last_success_at).toLocaleString('zh-CN') : '—'}</div></div>
                <div><div className="text-muted-foreground">需要授权</div><div>{source.requires_auth ? '是' : '否'}</div></div>
                <div><div className="text-muted-foreground">已配置凭证</div><div>{source.credential_configured ? '是' : '否'}</div></div>
              </div>
              {source.last_error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-xs text-red-700">
                  <div className="font-medium mb-1">最近错误 [{source.last_error_code}]</div>
                  {source.last_error_message}
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-2">最近 10 次采集/测试</div>
                {runs.length === 0 && <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3">尚无采集记录。点击「测试连接」触发真实 HTTP 请求。</div>}
                <div className="space-y-1.5">
                  {runs.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1.5 gap-2">
                      <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString('zh-CN')}</span>
                      <span className="flex-1 text-center">{r.run_type} · HTTP {r.http_status ?? '—'} · {r.response_time_ms ?? '—'}ms</span>
                      <span className={r.status === 'success' ? 'text-emerald-600' : 'text-red-600'}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <Button size="sm" className="gap-1.5" disabled={testing} onClick={() => onTest(source.id)}>
                  <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />测试连接
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(source.source_url, '_blank')}>打开原站</Button>
                <Button size="sm" variant="ghost" className="text-red-600 ml-auto gap-1.5" onClick={() => { if (confirm('确定删除？')) onDelete(source.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />删除
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SourceEditor({ onClose, onSave }: { onClose: () => void; onSave: (v: Record<string, unknown>) => Promise<void> }) {
  const [v, setV] = useState({
    name: '', category: 'policy', source_type: '',
    authority_level: 'A', is_official: false, source_url: '',
    access_mode: 'public_web', collection_method: '定时抓取', collection_frequency: '每小时',
    requires_auth: false, enabled: true,
  });
  const [saving, setSaving] = useState(false);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
        <SheetHeader><SheetTitle>新建信息源</SheetTitle></SheetHeader>
        <form className="mt-5 space-y-4 text-sm" onSubmit={async (e) => {
          e.preventDefault(); setSaving(true);
          try { await onSave(v); } catch (err) { toast.error(err instanceof Error ? err.message : '保存失败'); }
          finally { setSaving(false); }
        }}>
          <Field label="名称"><Input required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
          <Field label="URL"><Input required type="url" value={v.source_url} onChange={(e) => setV({ ...v, source_url: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="情报分类">
              <Select value={v.category} onValueChange={(x) => setV({ ...v, category: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">政策监管</SelectItem>
                  <SelectItem value="competitor">功能竞品</SelectItem>
                  <SelectItem value="sentiment">舆论反馈</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="来源等级">
              <Select value={v.authority_level} onValueChange={(x) => setV({ ...v, authority_level: x })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['S', 'A', 'B', 'C', 'D'].map((l) => <SelectItem key={l} value={l}>{l} 级</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="接入模式">
            <Select value={v.access_mode} onValueChange={(x) => setV({ ...v, access_mode: x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACCESS_MODES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="来源类型"><Input value={v.source_type} onChange={(e) => setV({ ...v, source_type: e.target.value })} /></Field>
            <Field label="采集频率"><Input value={v.collection_frequency} onChange={(e) => setV({ ...v, collection_frequency: e.target.value })} /></Field>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_official} onChange={(e) => setV({ ...v, is_official: e.target.checked })} />官方来源</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={v.requires_auth} onChange={(e) => setV({ ...v, requires_auth: e.target.checked })} />需要授权</label>
          </div>
          <div className="flex gap-2 pt-3 border-t">
            <Button type="submit" disabled={saving}>{saving ? '保存中…' : '创建'}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-xs text-muted-foreground mb-1">{label}</div>{children}</div>;
}
