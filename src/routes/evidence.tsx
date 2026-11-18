import { createFileRoute, useSearch, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { ExternalLink, ShieldCheck, ShieldAlert, Camera } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { tierClass, categoryLabel } from '@/lib/style-helpers';
import type { EvidenceItem, EvidenceStatus } from '@/lib/types';
import { formatDateTime } from '@/lib/engine/dates';

interface Search {
  open?: string;
}

export const Route = createFileRoute('/evidence')({
  validateSearch: (s: Record<string, unknown>): Search => ({ open: s.open as string | undefined }),
  component: EvidencePage,
});

const STATUS_LABEL: Record<EvidenceStatus, string> = {
  unverified: "待校验",
  verifying: "校验中",
  verified_online: "在线已核验",
  verified_snapshot: "快照已核验",
  lead_only: "仅线索",
  conflict: "存在冲突",
  blocked: "不可采信",
  obsolete: "已失效",
};
const STATUS_STYLE: Record<EvidenceStatus, string> = {
  unverified: "bg-amber-50 text-amber-700",
  verifying: "bg-sky-50 text-sky-700",
  verified_online: "bg-emerald-50 text-emerald-700",
  verified_snapshot: "bg-emerald-50 text-emerald-700",
  lead_only: "bg-slate-50 text-slate-600",
  conflict: "bg-red-50 text-red-700",
  blocked: "bg-rose-100 text-rose-700",
  obsolete: "bg-muted text-muted-foreground",
};

function EvidencePage() {
  const { evidence } = useStore();
  const search = useSearch({ from: '/evidence' });
  const navigate = useNavigate();
  const [detail, setDetail] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    if (search.open) {
      const ev = evidence.find((e) => e.evidenceId === search.open);
      if (ev) setDetail(ev);
    }
  }, [search.open, evidence]);

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">原文证据库</h2>
        <p className="text-sm text-muted-foreground mt-1">所有结论都能回到原文 · 可追溯 · 可校验</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">ID</th>
              <th className="text-left px-3 py-2.5 font-medium">标题</th>
              <th className="text-left px-3 py-2.5 font-medium">来源</th>
              <th className="text-left px-3 py-2.5 font-medium">等级</th>
              <th className="text-left px-3 py-2.5 font-medium">发布时间</th>
              <th className="text-right px-3 py-2.5 font-medium">评分</th>
              <th className="text-left px-3 py-2.5 font-medium">状态</th>
              <th className="text-right px-3 py-2.5 font-medium">引用</th>
              <th className="text-right px-4 py-2.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((e) => (
              <tr key={e.evidenceId} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setDetail(e)}>
                <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{e.evidenceId}</td>
                <td className="px-3 py-2.5 font-medium max-w-md">
                  <div className="truncate">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{e.summary}</div>
                </td>
                <td className="px-3 py-2.5 text-xs">{e.sourceName}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className={`text-[10px] ${tierClass(e.authorityLevel)}`}>{e.authorityLevel}</Badge>
                    {e.isOfficial && <Badge variant="secondary" className="text-[10px]">官方</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.publishedAt ? formatDateTime(e.publishedAt) : "—"}</td>
                <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                  {e.score ? (
                    <span className={e.score.grade === "pass" ? "text-emerald-600" : e.score.grade === "warning" ? "text-amber-600" : "text-rose-600"}>
                      {e.score.total}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={`text-[10px] ${STATUS_STYLE[e.verificationStatus]} border-0`}>{STATUS_LABEL[e.verificationStatus]}</Badge>
                </td>
                <td className="px-3 py-2.5 text-right text-xs">{e.quotedByEvents.length}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" size="sm" className="h-7 text-xs">查看</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Sheet
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) {
            setDetail(null);
            if (search.open) navigate({ to: '/evidence', search: {} });
          }
        }}
      >
        <SheetContent className="w-[620px] sm:max-w-[620px] overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="leading-snug">{detail.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge className={tierClass(detail.authorityLevel)}>{detail.authorityLevel} 级</Badge>
                  {detail.isOfficial && <Badge variant="secondary">官方</Badge>}
                  <Badge variant="outline">{categoryLabel(detail.category)}</Badge>
                  <Badge className={`${STATUS_STYLE[detail.verificationStatus]} border-0`}>{STATUS_LABEL[detail.verificationStatus]}</Badge>
                  {detail.canBePolicyEvidence && <Badge className="bg-blue-100 text-blue-700 border-0">可作为政策依据</Badge>}
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1">来源 · 发布时间 · 采集时间</div>
                  <div className="text-xs">{detail.sourceName} · 发布 {detail.publishedAt} · 采集 {detail.collectedAt}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">原文摘要</div>
                  <div>{detail.summary}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">原文快照</div>
                  <div className="bg-muted/40 rounded p-3 text-xs leading-relaxed border">{detail.snapshotText}</div>
                </div>

                <div className="flex items-center gap-2">
                  {/^https?:\/\//i.test(detail.originalUrl) ? (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.open(detail.originalUrl, '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" /> 打开原文
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">内部源（{detail.originalUrl}），无公网原文</span>
                  )}
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5" /> 快照 {detail.snapshotText.length} 字 · 指纹 {detail.contentHash?.slice(0, 10)} · v{detail.version}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">关键词</div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.keywords.map((k) => <Badge key={k} variant="outline" className="text-[10px]">{k}</Badge>)}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary" /> 证据评分（可审计）
                  </div>
                  {detail.score ? (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-left py-1.5 font-normal">维度</th>
                          <th className="text-right py-1.5 font-normal">权重</th>
                          <th className="text-right py-1.5 font-normal">得分</th>
                          <th className="text-left py-1.5 pl-3 font-normal">说明</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.score.dimensions.map((d) => (
                          <tr key={d.key} className="border-t">
                            <td className="py-1.5">{d.label}</td>
                            <td className="py-1.5 text-right tabular-nums">{(d.weight * 100).toFixed(0)}%</td>
                            <td className="py-1.5 text-right tabular-nums">{d.points}</td>
                            <td className="py-1.5 pl-3 text-muted-foreground">{d.note}</td>
                          </tr>
                        ))}
                        <tr className="border-t font-medium">
                          <td className="py-1.5">冲突 / 总分</td>
                          <td className="py-1.5 text-right">—</td>
                          <td className="py-1.5 text-right tabular-nums">
                            {detail.score.conflictPenalty > 0 ? `-${detail.score.conflictPenalty}` : "0"} / {detail.score.total}
                          </td>
                          <td className="py-1.5 pl-3 text-muted-foreground">等级 {detail.score.grade}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-xs text-muted-foreground">无评分记录。</div>
                  )}
                  {(detail.conflictWith?.length ?? 0) > 0 && (
                    <div className="mt-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded p-2">
                      与 {detail.conflictWith?.length} 条其他证据存在口径冲突，已隔离，不进入结论。
                    </div>
                  )}
                  <div className="mt-3 text-xs bg-blue-50 text-blue-800 p-3 rounded border border-blue-200">
                    <b>可作为政策依据：</b>{" "}
                    {detail.canBePolicyEvidence
                      ? "✅ 可以。官方源 + 高分（pass）+ 无冲突 + 原文可回溯。"
                      : "❌ 不能。仅可作为产品线索，不能等同于政策事实。"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">被引用的情报事件</div>
                  <div className="space-y-1">
                    {detail.quotedByEvents.map((id) => (
                      <button key={id} className="text-primary text-xs hover:underline block"
                        onClick={() => navigate({ to: '/events', search: { open: id } as never })}>
                        → {id}
                      </button>
                    ))}
                    {detail.quotedByEvents.length === 0 && <span className="text-xs text-muted-foreground">尚未被引用</span>}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
