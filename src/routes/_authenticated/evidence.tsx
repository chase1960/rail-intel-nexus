import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { listEvidence, createManualEvidence, verifyEvidence } from '@/lib/evidence.functions';
import { listSources } from '@/lib/sources.functions';

export const Route = createFileRoute('/_authenticated/evidence')({
  component: EvidencePage,
});

const V_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  unverified: { label: '未校验', color: 'bg-slate-100 text-slate-700' },
  verifying: { label: '校验中', color: 'bg-blue-100 text-blue-700' },
  verified_online: { label: '在线原文已验证', color: 'bg-emerald-100 text-emerald-700' },
  verified_snapshot: { label: '快照已验证', color: 'bg-teal-100 text-teal-700' },
  lead_only: { label: '仅作线索', color: 'bg-amber-100 text-amber-700' },
  conflict: { label: '存在冲突', color: 'bg-red-100 text-red-700' },
  blocked: { label: '校验受阻', color: 'bg-red-100 text-red-700' },
  obsolete: { label: '已过时', color: 'bg-slate-100 text-slate-500' },
};

function EvidencePage() {
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const list = useServerFn(listEvidence);
  const create = useServerFn(createManualEvidence);
  const verify = useServerFn(verifyEvidence);
  const listSrc = useServerFn(listSources);

  const { data: evidence = [] } = useQuery({ queryKey: ['evidence'], queryFn: () => list() });
  const { data: sources = [] } = useQuery({ queryKey: ['sources'], queryFn: () => listSrc() });

  const verifyMut = useMutation({
    mutationFn: (id: string) => verify({ data: { id } }),
    onSuccess: (r) => { toast.success(`校验完成：${r.final_result}${r.blockers?.length ? ` · blockers: ${r.blockers.join(',')}` : ''}`); qc.invalidateQueries({ queryKey: ['evidence'] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">原文证据库</h2>
          <p className="text-sm text-muted-foreground mt-1">共 {evidence.length} 条证据。每条证据均保留版本快照，校验结果来自 verification_runs。</p>
        </div>
        <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5" disabled={sources.length === 0}>
          <Plus className="w-4 h-4" />新建人工取证
        </Button>
      </div>

      {sources.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          还没有任何信息源。请先到「信息源管理」录入至少一个来源，再回到这里创建证据。
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">标题</th>
              <th className="text-left px-3 py-2.5 font-medium">来源</th>
              <th className="text-left px-3 py-2.5 font-medium">发布</th>
              <th className="text-left px-3 py-2.5 font-medium">采集</th>
              <th className="text-left px-3 py-2.5 font-medium">校验状态</th>
              <th className="text-left px-3 py-2.5 font-medium">政策依据</th>
              <th className="text-right px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {evidence.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-xs">当前时间范围内暂无证据。</td></tr>
            )}
            {evidence.map((e) => {
              const src = (e as unknown as { sources: { name: string; authority_level: string } | null }).sources;
              const st = V_STATUS_LABEL[e.verification_status] ?? { label: e.verification_status, color: 'bg-slate-100' };
              return (
                <tr key={e.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-2.5"><div className="font-medium">{e.title}</div>{e.canonical_url && <a href={e.canonical_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary truncate max-w-md inline-block">{e.canonical_url}</a>}</td>
                  <td className="px-3 py-2.5 text-xs">{src?.name ?? '—'} {src?.authority_level && <Badge variant="outline" className="ml-1 text-[10px]">{src.authority_level}</Badge>}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.published_at ? new Date(e.published_at).toLocaleDateString('zh-CN') : '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(e.collected_at).toLocaleDateString('zh-CN')}</td>
                  <td className="px-3 py-2.5"><Badge className={`text-[10px] ${st.color}`}>{st.label}</Badge></td>
                  <td className="px-3 py-2.5 text-xs">{e.can_be_policy_evidence ? <span className="text-emerald-600">可作依据</span> : <span className="text-muted-foreground">否</span>}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                      disabled={verifyMut.isPending && verifyMut.variables === e.id}
                      onClick={() => verifyMut.mutate(e.id)}>
                      <ShieldCheck className="w-3.5 h-3.5" />校验
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {creating && (
        <ManualEvidenceEditor
          sources={sources}
          onClose={() => setCreating(false)}
          onSave={async (values) => {
            await create({ data: values });
            toast.success('已创建证据 v1');
            qc.invalidateQueries({ queryKey: ['evidence'] });
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}

function ManualEvidenceEditor({ sources, onClose, onSave }: {
  sources: Awaited<ReturnType<typeof listSources>>;
  onClose: () => void; onSave: (v: never) => Promise<void>;
}) {
  const [v, setV] = useState({
    source_id: sources[0]?.id ?? '', title: '', author: '', canonical_url: '',
    published_at: '', content_text: '', requires_login: false, online_access_status: 'accessible',
  });
  const [saving, setSaving] = useState(false);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
        <SheetHeader><SheetTitle>新建人工取证</SheetTitle></SheetHeader>
        <form className="mt-5 space-y-3 text-sm" onSubmit={async (e) => {
          e.preventDefault(); setSaving(true);
          try {
            await onSave({ ...v, published_at: v.published_at ? new Date(v.published_at).toISOString() : null } as never);
          } catch (err) { toast.error(err instanceof Error ? err.message : '保存失败'); }
          finally { setSaving(false); }
        }}>
          <div>
            <div className="text-xs text-muted-foreground mb-1">选择来源</div>
            <Select value={v.source_id} onValueChange={(x) => setV({ ...v, source_id: x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}（{s.authority_level}）</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><div className="text-xs text-muted-foreground mb-1">标题</div><Input required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><div className="text-xs text-muted-foreground mb-1">作者/账号</div><Input value={v.author} onChange={(e) => setV({ ...v, author: e.target.value })} /></div>
            <div><div className="text-xs text-muted-foreground mb-1">发布时间</div><Input type="datetime-local" value={v.published_at} onChange={(e) => setV({ ...v, published_at: e.target.value })} /></div>
          </div>
          <div><div className="text-xs text-muted-foreground mb-1">原文 URL</div><Input type="url" value={v.canonical_url} onChange={(e) => setV({ ...v, canonical_url: e.target.value })} /></div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">访问结果</div>
            <Select value={v.online_access_status} onValueChange={(x) => setV({ ...v, online_access_status: x })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="accessible">可正常访问</SelectItem>
                <SelectItem value="login_required">需要登录</SelectItem>
                <SelectItem value="deleted">页面已删除</SelectItem>
                <SelectItem value="forbidden">权限不足</SelectItem>
                <SelectItem value="network_restricted">网络受限</SelectItem>
                <SelectItem value="inconsistent">内容与线索不一致</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={v.requires_login} onChange={(e) => setV({ ...v, requires_login: e.target.checked })} />需要登录才能访问</label>
          <div><div className="text-xs text-muted-foreground mb-1">正文（复制原文粘贴）</div><Textarea required rows={8} value={v.content_text} onChange={(e) => setV({ ...v, content_text: e.target.value })} /></div>
          <p className="text-[11px] text-muted-foreground">提交后会自动创建 evidence_items + evidence_versions v1，并写入 audit_logs。文件/截图上传能力将在下一轮接入 Storage 签名 URL。</p>
          <div className="flex gap-2 pt-3 border-t">
            <Button type="submit" disabled={saving || !v.source_id}>{saving ? '保存中…' : '创建证据 v1'}</Button>
            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
