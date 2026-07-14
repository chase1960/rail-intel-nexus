import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Database,
  ListChecks,
  FileText,
  Layers,
  Grid3x3,
  FileBarChart,
  Search,
  Bell,
  RotateCcw,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { store, useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const NAV = [
  { to: '/', label: '情报总览', icon: LayoutDashboard },
  { to: '/sources', label: '信息源管理', icon: Database },
  { to: '/tasks', label: '采集任务', icon: ListChecks },
  { to: '/evidence', label: '原文证据库', icon: FileText },
  { to: '/events', label: '情报事件工作台', icon: Layers },
  { to: '/impact', label: '产品影响图谱', icon: Grid3x3 },
  { to: '/reports', label: '报告生成中心', icon: FileBarChart },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar pathname={pathname} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar />
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
          <div className="w-8 h-8 rounded-md bg-sidebar-primary/90 flex items-center justify-center text-sidebar-primary-foreground font-bold">
            铁
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm">火车票情报中台</div>
            <div className="text-[11px] text-sidebar-foreground/60 truncate">Train Ticket Intel Hub</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary'
                  : 'hover:bg-sidebar-accent/50 border-l-2 border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
        Demo · v0.1 · Mock 数据
      </div>
    </aside>
  );
}

function TopBar() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const { events, evidence, reports } = useStore();

  const results = useMemo(() => {
    if (!q.trim()) return null;
    const kw = q.trim().toLowerCase();
    return {
      events: events.filter((e) => e.title.toLowerCase().includes(kw) || e.summary.toLowerCase().includes(kw)).slice(0, 4),
      evidence: evidence.filter((e) => e.title.toLowerCase().includes(kw)).slice(0, 4),
      reports: reports.filter((r) => r.reportType.includes(q) || r.summary.includes(q)).slice(0, 3),
    };
  }, [q, events, evidence, reports]);

  return (
    <header className="h-14 bg-card border-b flex items-center gap-4 px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-sm font-semibold whitespace-nowrap">火车票情报中台</h1>
        <span className="text-xs text-muted-foreground hidden lg:inline">政策 / 监管 / 舆情 / 竞品 Agent 中台</span>
      </div>
      <div className="flex-1 max-w-md relative">
        <Popover open={open && !!results} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索信息源 / 证据 / 事件 / 报告"
                className="pl-9 h-9"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setOpen(!!e.target.value);
                }}
                onFocus={() => q && setOpen(true)}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-2" align="start">
            {results && (
              <div className="space-y-3 text-sm max-h-96 overflow-auto">
                {results.events.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground px-2 pb-1">情报事件</div>
                    {results.events.map((e) => (
                      <button
                        key={e.eventId}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                        onClick={() => {
                          setOpen(false);
                          setQ('');
                          navigate({ to: '/events', search: { open: e.eventId } as never });
                        }}
                      >
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{e.summary}</div>
                      </button>
                    ))}
                  </div>
                )}
                {results.evidence.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground px-2 pb-1">原文证据</div>
                    {results.evidence.map((e) => (
                      <button
                        key={e.evidenceId}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                        onClick={() => {
                          setOpen(false);
                          setQ('');
                          navigate({ to: '/evidence', search: { open: e.evidenceId } as never });
                        }}
                      >
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground">{e.sourceName}</div>
                      </button>
                    ))}
                  </div>
                )}
                {results.reports.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-muted-foreground px-2 pb-1">报告</div>
                    {results.reports.map((r) => (
                      <button
                        key={r.reportId}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                        onClick={() => {
                          setOpen(false);
                          setQ('');
                          navigate({ to: '/reports' });
                        }}
                      >
                        <div className="font-medium">{r.reportType} · {r.dateRange}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.summary}</div>
                      </button>
                    ))}
                  </div>
                )}
                {results.events.length + results.evidence.length + results.reports.length === 0 && (
                  <div className="text-xs text-muted-foreground p-3">无匹配结果</div>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <span className="text-xs text-muted-foreground hidden md:inline">2025-07-10 周四</span>
        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
          Demo 数据
        </Badge>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        </Button>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="hidden md:inline">产品经理</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => {
            store.reset();
            toast.success('Demo 数据已重置');
          }}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          重置 Demo
        </Button>
      </div>
    </header>
  );
}
