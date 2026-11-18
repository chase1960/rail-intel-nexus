import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Database, Clock, Wifi, WifiOff, LogIn, FileDown, Settings2, Globe } from "lucide-react";
import { SOURCES } from "@/lib/engine/source-registry";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { tierClass, categoryLabel } from "@/lib/style-helpers";
import type { IntelligenceSource } from "@/lib/types";
import { formatDateTime } from "@/lib/engine/dates";

export const Route = createFileRoute("/sources")({
  component: SourcesPage,
});

const ACCESS_LABELS: Record<string, string> = {
  public_web: "公网页面",
  public_api: "公开 API",
  oauth_api: "OAuth 授权",
  login_manual: "登录态 + 人工转发",
  internal_connector: "内部接口",
  file_import: "文件导入",
  external_collection_service: "第三方采集服务",
};

const CONNECTION_META: Record<string, { label: string; icon: typeof Wifi; tone: string }> = {
  connected: { label: "可直采", icon: Wifi, tone: "text-emerald-700 border-emerald-200" },
  degraded: { label: "降级/不稳定", icon: WifiOff, tone: "text-amber-700 border-amber-200" },
  login_required: { label: "需登录态", icon: LogIn, tone: "text-amber-700 border-amber-200" },
  unconfigured: { label: "未配置", icon: Settings2, tone: "text-slate-600 border-slate-200" },
  auth_required: { label: "待授权", icon: LogIn, tone: "text-amber-700 border-amber-200" },
  blocked: { label: "被阻断", icon: WifiOff, tone: "text-rose-700 border-rose-200" },
  failed: { label: "失败", icon: WifiOff, tone: "text-rose-700 border-rose-200" },
  disabled: { label: "已停用", icon: Settings2, tone: "text-slate-600 border-slate-200" },
  testing: { label: "测试中", icon: Clock, tone: "text-sky-700 border-sky-200" },
};

function SourcesPage() {
  const [filter, setFilter] = useState<"all" | "policy" | "competitor" | "sentiment">("all");
  const [detail, setDetail] = useState<IntelligenceSource | null>(null);
  const { coverage } = useStore();

  const list = SOURCES.filter((s) => filter === "all" || s.category === filter);
  const counts = {
    policy: SOURCES.filter((s) => s.category === "policy").length,
    competitor: SOURCES.filter((s) => s.category === "competitor").length,
    sentiment: SOURCES.filter((s) => s.category === "sentiment").length,
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">信息源管理</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {SOURCES.length} 个源声明式注册：权威级别、访问方式、连接状态、抓取策略全部显式登记。
          “可直采 / 需登录 / 未配置” 是事实，不是文案。
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as never)}>
          <TabsList>
            <TabsTrigger value="all">全部 ({SOURCES.length})</TabsTrigger>
            <TabsTrigger value="policy">政策监管 ({counts.policy})</TabsTrigger>
            <TabsTrigger value="competitor">功能竞品 ({counts.competitor})</TabsTrigger>
            <TabsTrigger value="sentiment">舆论反馈 ({counts.sentiment})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-[11px] text-muted-foreground">
          本轮有产出的源：{coverage.filter((c) => c.docs > 0).length} / {SOURCES.length}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs text-muted-foreground">
              <th className="text-left px-4 py-2.5 font-medium">来源名称</th>
              <th className="text-left px-3 py-2.5 font-medium">情报类型</th>
              <th className="text-left px-3 py-2.5 font-medium">级别</th>
              <th className="text-left px-3 py-2.5 font-medium">访问方式</th>
              <th className="text-left px-3 py-2.5 font-medium">连接状态</th>
              <th className="text-right px-3 py-2.5 font-medium">本轮原文 / 有效</th>
              <th className="text-left px-3 py-2.5 font-medium">最近采集</th>
              <th className="text-left px-3 py-2.5 font-medium">抓取策略</th>
            </tr>
          </thead>
          <tbody>
            {list.map((source) => {
              const cov = coverage.find((c) => c.sourceId === source.sourceId);
              const connection = CONNECTION_META[source.connectionStatus ?? "unconfigured"] ?? CONNECTION_META.unconfigured;
              const ConnectionIcon = connection.icon;
              return (
                <tr key={source.sourceId} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setDetail(source)}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium flex items-center gap-1.5">
                      {source.name}
                      {source.isOfficial && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{source.canonicalDomain}</div>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{categoryLabel(source.category)}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={`text-[10px] ${tierClass(source.authorityLevel)}`}>
                      {source.authorityLevel}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs">{ACCESS_LABELS[source.accessMode ?? "public_web"] ?? source.accessMode}</td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className={`text-[10px] gap-1 ${connection.tone}`}>
                      <ConnectionIcon className="w-3 h-3" />
                      {connection.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                    {cov ? `${cov.docs} / ${cov.newEvidence}` : "—"}
                    {cov && cov.duplicates > 0 && <span className="text-muted-foreground">（去重 {cov.duplicates}）</span>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {cov?.docs ? formatDateTime(cov.lastCollectedAt) : "本轮无更新"}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{source.fetchStrategy}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Database className="w-4 h-4" /> 关于“源覆盖”的诚实说明
        </div>
        <div className="text-xs text-muted-foreground space-y-1 leading-relaxed">
          <div>· 本期默认使用样本语料：时间按「距今 N 小时」相对生成，所以永远看起来是“本周”，但内容是演示数据。</div>
          <div>· 公网直采仅对白名单域开放（12306 / 国铁 / 交通部 / 铁路局 / 携程 / 去哪儿 / 飞猪 / App Store / 应用宝 / 黑猫）。</div>
          <div>· 小红书、公众号、内部工单、调研需要登录态或内部接口，本轮以样本或人工导入替代，UI 不做“已采集”的假象。</div>
        </div>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="leading-snug">{detail.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge className={tierClass(detail.authorityLevel)}>{detail.authorityLevel} 级</Badge>
                  {detail.isOfficial && <Badge variant="secondary">官方</Badge>}
                  <Badge variant="outline">{categoryLabel(detail.category)}</Badge>
                  <Badge variant="outline">{ACCESS_LABELS[detail.accessMode ?? ""] ?? detail.accessMode}</Badge>
                </div>
                <div className="text-xs space-y-1.5">
                  <div>
                    <span className="text-muted-foreground">源地址：</span>
                    {detail.sourceUrl}
                  </div>
                  <div>
                    <span className="text-muted-foreground">采集方式：</span>
                    {detail.collectionMethod}
                  </div>
                  <div>
                    <span className="text-muted-foreground">频率：</span>
                    {detail.collectionFrequency}
                  </div>
                  <div>
                    <span className="text-muted-foreground">抓取策略：</span>
                    <span className="font-mono">{detail.fetchStrategy}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">是否需要登录：</span>
                    {detail.requiresAuth ? "是" : "否"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">初始可信度：</span>
                    {Math.round((detail.reliability ?? 0.7) * 100)}%（会被人工反馈持续校准）
                  </div>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/40 rounded p-3 border">
                  {detail.connectionStatus === "connected"
                    ? "该源公网可直采。接入实时抓取时，需要遵守域名白名单与频控，避免对官方站点造成压力。"
                    : detail.connectionStatus === "login_required"
                      ? "该源需要登录态。合规做法是人工转发到收集箱，或使用授权 API，不做绕过登录的抓取。"
                      : "该源为内部接口/文件导入，本轮未配置，用样本替代。接入需走内部数据申请流程。"}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
