import { createFileRoute } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { createServerFn } from '@tanstack/react-start';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, Wrench, Database, FileText, Layers, FileBarChart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { seedSampleSources } from '@/lib/sources.functions';
import { seedSampleEvidence } from '@/lib/evidence.functions';

const getSystemStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const [sources, evidence, runs, vruns, events] = await Promise.all([
    supabaseAdmin.from('sources').select('*'),
    supabaseAdmin.from('evidence_items').select('id, verification_status'),
    supabaseAdmin.from('collection_runs').select('id, status, started_at').order('started_at', { ascending: false }).limit(20),
    supabaseAdmin.from('verification_runs').select('id, final_result').limit(50),
    supabaseAdmin.from('intelligence_events').select('id, workflow_status'),
  ]);
  return {
    sources: sources.data ?? [],
    evidenceCount: evidence.data?.length ?? 0,
    runsRecent: runs.data ?? [],
    vrunsCount: vruns.data?.length ?? 0,
    eventsCount: events.data?.length ?? 0,
  };
});

export const Route = createFileRoute('/_authenticated/system-status')({
  component: SystemStatusPage,
});

type CapStatus = 'REAL' | 'PARTIAL' | 'BLOCKED' | 'NOT_CONFIGURED' | 'MANUAL_ONLY';

const STATUS_STYLE: Record<CapStatus, { color: string; icon: React.ReactNode; label: string }> = {
  REAL:            { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'REAL 已真实运行' },
  PARTIAL:         { color: 'bg-amber-100 text-amber-800 border-amber-200',       icon: <AlertCircle className="w-3.5 h-3.5" />,   label: 'PARTIAL 部分可用' },
  BLOCKED:         { color: 'bg-red-100 text-red-800 border-red-200',             icon: <XCircle className="w-3.5 h-3.5" />,       label: 'BLOCKED 阻塞' },
  NOT_CONFIGURED:  { color: 'bg-slate-100 text-slate-700 border-slate-200',       icon: <HelpCircle className="w-3.5 h-3.5" />,    label: 'NOT_CONFIGURED 未配置' },
  MANUAL_ONLY:     { color: 'bg-blue-100 text-blue-800 border-blue-200',          icon: <Wrench className="w-3.5 h-3.5" />,        label: 'MANUAL_ONLY 仅人工' },
};

function Pill({ s }: { s: CapStatus }) {
  const st = STATUS_STYLE[s];
  return <span className={`inline-flex items-center gap-1 text-[11px] border rounded px-1.5 py-0.5 ${st.color}`}>{st.icon}{st.label}</span>;
}

const STEPS: { icon: React.ReactNode; title: string; body: string; nav: string }[] = [
  { icon: <Database className="w-4 h-4" />, title: '① 录入信息源', body: '在「信息源管理」里新增或直接使用示例来源（国铁集团、12306），设置分类（政策 / 竞品 / 舆情）和权威等级 S~D。可点「测试连接」触发真实抓取。', nav: '/sources' },
  { icon: <FileText className="w-4 h-4" />, title: '② 收集原文证据', body: '在「原文证据库」里录入原文（标题 / URL / 正文），系统自动写入哈希与版本快照，点「校验」跑 6 维度真伪流水。', nav: '/evidence' },
  { icon: <Layers className="w-4 h-4" />, title: '③ 聚合成情报事件', body: '在「事件工作台」把多条来源印证的证据聚合成一条事件，标注风险等级 P1~P3、受影响产品模块和建议动作。', nav: '/events' },
  { icon: <FileBarChart className="w-4 h-4" />, title: '④ 生成报告', body: '在「报告生成中心」按时间段 / 类型自动挑选高优事件，导出简报 CSV 或打印为一页情报。', nav: '/reports' },
];

function SystemStatusPage() {
  const fn = useServerFn(getSystemStatus);
  const { data, refetch } = useQuery({ queryKey: ['system-status'], queryFn: () => fn() });
  const qc = useQueryClient();
  const seedS = useServerFn(seedSampleSources);
  const seedE = useServerFn(seedSampleEvidence);
  const seedSources = useMutation({
    mutationFn: () => seedS(),
    onSuccess: (r) => { toast.success(`来源示例：新增 ${r.inserted}，跳过 ${r.skipped}`); refetch(); qc.invalidateQueries({ queryKey: ['sources'] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });
  const seedEvidence = useMutation({
    mutationFn: () => seedE(),
    onSuccess: (r) => { toast.success(`证据示例：新增 ${r.inserted}，跳过 ${r.skipped}`); refetch(); qc.invalidateQueries({ queryKey: ['evidence'] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : String(e)),
  });

  const capabilities: { name: string; status: CapStatus; note: string }[] = [
    { name: '数据库', status: 'REAL', note: `11 张业务表已迁移，${data?.sources.length ?? 0} 个来源，${data?.evidenceCount ?? 0} 条证据。` },
    { name: 'Auth 登录', status: 'NOT_CONFIGURED', note: 'MVP 阶段所有页面开放访问，专注于跑通采集-校验-聚合链路。' },
    { name: 'Storage 私有 bucket', status: 'PARTIAL', note: 'evidence-archives 已建为私有；签名 URL 上传下一轮接入。' },
    { name: '服务端函数', status: 'REAL', note: 'test-source-connection、verify-evidence、seed-sample 通过 createServerFn 真实运行。' },
    { name: 'AI 服务', status: 'NOT_CONFIGURED', note: '暂未接入 LLM。所有分类/摘要仅为人工整理。' },
    { name: '定时采集任务', status: 'NOT_CONFIGURED', note: 'pg_cron 未启用；先跑通手动链路。' },
    { name: '网页截图服务', status: 'BLOCKED', note: 'Worker 环境无浏览器渲染；快照仅支持粘贴文本。' },
    { name: '报告导出', status: 'PARTIAL', note: 'CSV 可导出；PDF 尚未接入。' },
  ];

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">系统接入状态 & 操作指南</h2>
        <p className="text-sm text-muted-foreground mt-1">先读操作指南跑通链路，再看接入状态确认哪些能力真实运行。</p>
      </div>

      {/* Operation guide */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />零门槛操作指南</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7"
              onClick={() => seedSources.mutate()} disabled={seedSources.isPending}>
              一键录入示例来源
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7"
              onClick={() => seedEvidence.mutate()} disabled={seedEvidence.isPending}>
              一键录入示例证据
            </Button>
          </div>
        </div>
        <Card className="p-4">
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.body}</div>
                </div>
                <a href={s.nav} className="text-xs text-primary hover:underline shrink-0 mt-1">前往 →</a>
              </li>
            ))}
          </ol>
          <div className="border-t mt-4 pt-3 text-xs text-muted-foreground leading-relaxed">
            <div><b>数据来源怎么判断真伪？</b>每条证据在校验时会跑 6 个维度：来源身份、可访问性、元数据、快照存在、正文完整性、时效性。任一维度阻塞 → 状态标红为"blocked"；全通过 → "verified_online"。</div>
            <div className="mt-1"><b>快速上手？</b>点上方两个"一键录入示例"按钮 → 打开信息源管理 → 点测试连接 → 打开证据库 → 点校验 → 回到情报总览查看结果。</div>
          </div>
        </Card>
      </section>

      <section>
        <h3 className="text-sm font-medium mb-3">基础能力接入状态</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {capabilities.map((c) => (
            <Card key={c.name} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm">{c.name}</div>
                <Pill s={c.status} />
              </div>
              <div className="text-xs text-muted-foreground mt-2">{c.note}</div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium mb-3">来源接入（{data?.sources.length ?? 0}）</h3>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="text-left px-4 py-2">来源</th><th className="text-left px-3 py-2">接入模式</th><th className="text-left px-3 py-2">连接状态</th><th className="text-left px-3 py-2">最近测试</th></tr>
            </thead>
            <tbody>
              {(data?.sources ?? []).length === 0 && <tr><td colSpan={4} className="p-6 text-center text-xs text-muted-foreground">还没有来源。点上方「一键录入示例来源」。</td></tr>}
              {(data?.sources ?? []).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-xs">{s.access_mode}</td>
                  <td className="px-3 py-2 text-xs">
                    <Badge variant="outline" className={`text-[10px] ${s.connection_status === 'connected' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : s.connection_status === 'unconfigured' ? 'bg-slate-50 text-slate-700 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                      {s.connection_status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.last_tested_at ? new Date(s.last_tested_at).toLocaleString('zh-CN') : '未测试'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h3 className="text-sm font-medium mb-3">最近采集/测试记录（{data?.runsRecent.length ?? 0}）</h3>
        <Card className="p-3">
          {(data?.runsRecent ?? []).length === 0 && <div className="text-xs text-muted-foreground text-center py-4">无</div>}
          <ul className="text-xs space-y-1">
            {(data?.runsRecent ?? []).map((r) => (
              <li key={r.id} className="flex justify-between gap-2 border-b border-dashed last:border-0 py-1">
                <span className="text-muted-foreground">{new Date(r.started_at).toLocaleString('zh-CN')}</span>
                <span className={r.status === 'success' ? 'text-emerald-600' : 'text-red-600'}>{r.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
