import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { FileBarChart, Copy, FileDown, RefreshCw } from "lucide-react";
import { useStore, store } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/engine/dates";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

const TYPES = [
  { key: "daily", label: "日报（当日运行结果）" },
  { key: "weekly", label: "周报（近 7 天窗口）" },
  { key: "topic", label: "专题（聚焦最高优先级主题）" },
] as const;

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ReportsPage() {
  const { reports, runs, events, evidence } = useStore();
  const [type, setType] = useState<"daily" | "weekly" | "topic">("daily");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const current = useMemo(() => {
    if (selectedId) {
      const found = reports.find((r) => r.reportId === selectedId);
      if (found) return found;
    }
    return reports[0];
  }, [reports, selectedId]);

  const generate = () => {
    const report = store.regenerateReport(type);
    if (report) {
      setSelectedId(report.reportId);
      toast.success("报告已由当前数据重新生成");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 max-w-[1400px]">
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">报告生成中心</h2>
          <p className="text-sm text-muted-foreground mt-1">
            报告是 Markdown 源文件，由数据生成；不再有“导出 PDF 成功”的假 toast。
          </p>
        </div>

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">报告类型</div>
          <RadioGroup value={type} onValueChange={(v) => setType(v as typeof type)} className="space-y-2">
            {TYPES.map((t) => (
              <div key={t.key} className="flex items-center gap-2">
                <RadioGroupItem value={t.key} id={t.key} />
                <Label htmlFor={t.key} className="text-sm cursor-pointer">
                  {t.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </Card>

        <Card className="p-4 space-y-2">
          <div className="text-sm font-medium">本轮数据概况</div>
          <div className="text-xs text-muted-foreground">
            事件 {events.length} 条 · 证据 {evidence.length} 条 · 运行 {runs.length} 次
          </div>
          <div className="text-xs text-muted-foreground">
            最近运行 {runs[0] ? formatDateTime(runs[0].finishedAt) : "—"}
          </div>
        </Card>

        <div className="space-y-2">
          <Button className="w-full gap-1.5" onClick={generate}>
            <RefreshCw className="w-4 h-4" /> 按当前数据重新生成
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!current?.markdown}
              onClick={() => {
                navigator.clipboard.writeText(current?.markdown ?? "");
                toast.success("Markdown 已复制到剪贴板");
              }}
            >
              <Copy className="w-3.5 h-3.5" /> 复制
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={!current?.markdown}
              onClick={() => {
                download(`${current?.reportType ?? "daily"}-${current?.dateRange ?? ""}.md`, current?.markdown ?? "");
                toast.success("已下载 Markdown 源文件");
              }}
            >
              <FileDown className="w-3.5 h-3.5" /> 下载 .md
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="text-sm font-medium mb-3">历史报告</div>
          <div className="space-y-1.5 max-h-64 overflow-auto">
            {reports.map((r) => (
              <button
                key={r.reportId}
                className={`w-full text-left text-xs px-2 py-1.5 rounded border ${
                  current?.reportId === r.reportId ? "border-primary/40 bg-primary/5" : "hover:bg-muted/40"
                }`}
                onClick={() => setSelectedId(r.reportId)}
              >
                <div className="font-medium">
                  {r.reportType} · {r.dateRange}
                </div>
                <div className="text-muted-foreground line-clamp-1">{r.summary}</div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 min-h-[800px]">
        {!current ? (
          <div className="text-sm text-muted-foreground">尚无报告，先运行一次流水线。</div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-2">
                <FileBarChart className="w-4 h-4 text-primary" />
                <span className="font-semibold text-sm">
                  {current.reportType} · {current.dateRange}
                </span>
              </div>
              <div className="flex gap-1.5">
                <Badge variant="outline" className="text-[10px]">
                  {current.dataOrigin === "sample" ? "样本语料" : "实时采集"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {current.metrics?.events ?? events.length} 事件 / {current.metrics?.p1 ?? 0} P1
                </Badge>
              </div>
            </div>
            <pre className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-sans bg-muted/20 rounded p-4 border max-h-[1100px] overflow-auto">
              {current.markdown}
            </pre>
            <div className="text-[11px] text-muted-foreground">
              生成时间 {formatDateTime(current.generatedAt)} · 报告 ID {current.reportId} · 本报告仅用于内部排序与验证
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
