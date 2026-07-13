import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, AlertCircle, HelpCircle, Wrench } from 'lucide-react';

const getSystemStatus = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [sources, evidence, runs, vruns, events, tests] = await Promise.all([
      context.supabase.from('sources').select('*'),
      context.supabase.from('evidence_items').select('id, verification_status, data_origin'),
      context.supabase.from('collection_runs').select('id, status, started_at').order('started_at', { ascending: false }).limit(20),
      context.supabase.from('verification_runs').select('id, final_result').limit(50),
      context.supabase.from('intelligence_events').select('id, workflow_status'),
      context.supabase.from('system_test_runs').select('*').order('started_at', { ascending: false }).limit(30),
    ]);
    return {
      sources: sources.data ?? [],
      evidenceCount: evidence.data?.length ?? 0,
      runsRecent: runs.data ?? [],
      vrunsCount: vruns.data?.length ?? 0,
      eventsCount: events.data?.length ?? 0,
      tests: tests.data ?? [],
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

function SystemStatusPage() {
  const fn = useServerFn(getSystemStatus);
  const { data } = useQuery({ queryKey: ['system-status'], queryFn: () => fn() });

  const capabilities: { name: string; status: CapStatus; note: string }[] = [
    { name: '数据库', status: 'REAL', note: `11 张业务表已迁移，${data?.sources.length ?? 0} 个来源，${data?.evidenceCount ?? 0} 条证据。` },
    { name: 'Auth 登录', status: 'REAL', note: '邮箱密码登录，_authenticated 子树受 RLS 保护。' },
    { name: 'RLS 策略', status: 'PARTIAL', note: 'MVP：所有已登录用户可读写；生产环境需按 user_roles 收敛。' },
    { name: 'Storage 私有 bucket', status: 'PARTIAL', note: 'evidence-archives 已创建为私有；签名 URL 上传/展示能力下一轮接入。' },
    { name: 'Edge / 服务端函数', status: 'REAL', note: 'test-source-connection、verify-evidence 通过 createServerFn 真实运行。' },
    { name: 'AI 服务', status: 'NOT_CONFIGURED', note: '暂未接入 LLM。所有分类/摘要仅为人工整理，未展示 AI 结果。' },
    { name: '定时采集任务', status: 'NOT_CONFIGURED', note: 'pg_cron 未启用。先跑通手动链路，稳定后再排定时。' },
    { name: '网页截图服务', status: 'NOT_CONFIGURED', note: 'Firecrawl / Browserless / Playwright 均未接入；快照仅支持文本粘贴。' },
    { name: '报告导出 CSV', status: 'PARTIAL', note: '页面已能生成 CSV blob；后续会接入 reports 表。' },
    { name: '报告导出 PDF', status: 'NOT_CONFIGURED', note: '仅打印友好页；未生成真实 PDF 文件。' },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">系统接入状态</h2>
        <p className="text-sm text-muted-foreground mt-1">真实呈现每一项能力当前状态，未运行的能力不会伪装成 REAL。</p>
      </div>

      <section>
        <h3 className="text-sm font-medium mb-3">A. 基础能力</h3>
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
        <h3 className="text-sm font-medium mb-3">B. 来源接入（{data?.sources.length ?? 0}）</h3>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="text-left px-4 py-2">来源</th><th className="text-left px-3 py-2">接入模式</th><th className="text-left px-3 py-2">连接状态</th><th className="text-left px-3 py-2">最近测试</th><th className="text-left px-3 py-2">下一步</th></tr>
            </thead>
            <tbody>
              {(data?.sources ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-xs text-muted-foreground">还没有来源。到「信息源管理」录入。</td></tr>}
              {(data?.sources ?? []).map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-3 py-2 text-xs">{s.access_mode}</td>
                  <td className="px-3 py-2 text-xs">{s.connection_status}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{s.last_tested_at ? new Date(s.last_tested_at).toLocaleString('zh-CN') : '未测试'}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {s.access_mode === 'public_web' && '点击「测试连接」触发真实抓取'}
                    {s.access_mode === 'login_manual' && '通过「原文证据库」人工取证录入'}
                    {s.access_mode === 'oauth_api' && '需先配置 API 凭证'}
                    {s.access_mode === 'internal_connector' && '需研发接入企业内部连接器'}
                    {s.access_mode === 'file_import' && '上传能力下一轮接入 Storage 签名 URL'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h3 className="text-sm font-medium mb-3">C. 待办阻塞</h3>
        <div className="space-y-2">
          {[
            { title: '网页截图/HTML 快照', block: '当前 Worker 环境无浏览器渲染能力', need: '需要外部服务：Firecrawl 或 Browserless', owner: '研发' },
            { title: '小红书 / B站 / 微博 API', block: '平台拒绝公开 API', need: '需要人工取证或授权采集账号', owner: '产品 + 法务' },
            { title: 'App Store 评论采集', block: '未配置官方 App Store Connect API 或第三方（如 Appfigures）', need: '需要账号授权 / API Key', owner: '产品经理配合' },
            { title: 'AI 分类与摘要', block: '尚未接入 Lovable AI Gateway', need: '本轮不阻塞主链路；配置后即可增强分类', owner: '产品决策是否开启' },
            { title: '定时采集', block: 'pg_cron 未启用', need: '至少 1 个公开来源手动跑通后再启用', owner: '研发' },
          ].map((b) => (
            <Card key={b.title} className="p-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">BLOCKED</Badge>
                <div className="text-sm flex-1">
                  <div className="font-medium">{b.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">卡点：{b.block}</div>
                  <div className="text-xs text-muted-foreground">解决：{b.need}</div>
                  <div className="text-xs text-muted-foreground">责任方：{b.owner}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium mb-3">D. 最近采集/测试记录（{data?.runsRecent.length ?? 0}）</h3>
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
