import { Link, useRouterState } from '@tanstack/react-router';
import { LayoutDashboard, Database, FileText, Layers, FileBarChart, Activity, TestTube, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDataMode, setDataMode } from '@/lib/data-mode';
import { useDateRange, setDateRange, RANGE_LABEL, type RangeKey } from '@/lib/date-range';
import { useEffect, useState } from 'react';

const NAV = [
  { to: '/', label: '情报总览', icon: LayoutDashboard, desc: '一句话结论 + 高优事件' },
  { to: '/sources', label: '信息源管理', icon: Database, desc: '录入 / 测试 / 分级' },
  { to: '/evidence', label: '原文证据库', icon: FileText, desc: '取证 · 快照 · 校验' },
  { to: '/events', label: '情报事件工作台', icon: Layers, desc: '聚合成事件 · 判断影响' },
  { to: '/reports', label: '报告生成中心', icon: FileBarChart, desc: '日报 · 周报 · 专题' },
  { to: '/system-status', label: '系统接入 & 指南', icon: Activity, desc: '能力状态 + 使用手册' },
] as const;

const RANGES: RangeKey[] = ['7d', '30d', '90d', 'all'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const mode = useDataMode();
  if (pathname === '/auth') return <>{children}</>;
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar pathname={pathname} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
        {mode === 'sample' && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-xs px-6 py-2 flex items-center gap-2">
            <TestTube className="w-3.5 h-3.5" />
            示例数据模式(SAMPLE)——所有 data_origin=sample 的记录仅用于演示，不进入真实报告。
            <button className="underline ml-2" onClick={() => setDataMode('real')}>切换到真实模式</button>
          </div>
        )}
        <main className="flex-1 p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-sidebar-primary/90 flex items-center justify-center text-sidebar-primary-foreground font-bold">铁</div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">火车票情报中台</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">Collect · Verify · Aggregate</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}
              className={`flex items-start gap-3 px-5 py-2.5 text-sm transition-colors ${
                active ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary' : 'hover:bg-sidebar-accent/50 border-l-2 border-transparent'
              }`}>
              <Icon className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div>{item.label}</div>
                <div className="text-[10px] text-sidebar-foreground/50">{item.desc}</div>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
        MVP v0.3 · 采集 → 校验 → 聚合
      </div>
    </aside>
  );
}

function TopBar() {
  const mode = useDataMode();
  const range = useDateRange();
  const [today, setToday] = useState<string>('');

  useEffect(() => {
    const now = new Date();
    const wd = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    setToday(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} 周${wd}`);
  }, []);

  return (
    <header className="h-14 bg-card border-b flex items-center gap-4 px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold whitespace-nowrap">火车票情报中台</h1>
        <span className="text-xs text-muted-foreground hidden lg:inline">政策 / 竞品 / 舆情 一体化情报</span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="flex items-center gap-1 border rounded-md px-1 py-0.5 bg-background">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground ml-1" />
          {RANGES.map((r) => (
            <button key={r}
              onClick={() => setDateRange(r)}
              className={`text-[11px] px-2 py-1 rounded ${range === r ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground hidden md:inline">{today}</span>
        <Badge variant="outline" className={`text-[10px] ${mode === 'real' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
          {mode === 'real' ? '真实数据' : '示例数据'}
        </Badge>
        <Button variant="ghost" size="sm" className="h-8 text-xs"
          onClick={() => setDataMode(mode === 'real' ? 'sample' : 'real')}>
          切到{mode === 'real' ? '示例' : '真实'}
        </Button>
      </div>
    </header>
  );
}
