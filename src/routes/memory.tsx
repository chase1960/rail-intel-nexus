import { createFileRoute } from "@tanstack/react-router";
import { Brain, Layers3, BookOpenCheck, RotateCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/engine/dates";
import { SOURCE_BY_ID } from "@/lib/engine/source-registry";

export const Route = createFileRoute("/memory")({
  component: MemoryPage,
});

function MemoryPage() {
  const { memory, events } = useStore();
  const semantic = memory.semantic;

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h2 className="text-xl font-semibold">记忆中心</h2>
        <p className="text-sm text-muted-foreground mt-1">
          三层记忆是「自进化」的载体：working 记住本轮上下文，episodic 记住发生过什么，semantic 记住学到什么。
          人工反馈会改写 semantic，下一轮打分与聚合随之变化 —— 不是模型变聪明，是规则和权重被校准。
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { title: "Working 工作记忆", value: memory.working.seenHashes.length, unit: "内容指纹", icon: Layers3 },
          { title: "Episodic 事件记忆", value: memory.episodic.length, unit: "张事件卡（上限 40）", icon: Brain },
          { title: "Semantic 规则记忆", value: semantic.playbookRules.length, unit: `条 playbook（${semantic.playbookRules.filter((r) => r.source === "learned").length} 条为学习所得）`, icon: BookOpenCheck },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.title} className="p-4">
              <Icon className="w-4 h-4 text-primary mb-2" />
              <div className="text-sm font-medium">{c.title}</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">{c.value}</div>
              <div className="text-[11px] text-muted-foreground">{c.unit}</div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3 flex items-center gap-1.5">
          <RotateCw className="w-3.5 h-3.5" /> 源先验（Beta 平滑，人工确认/驳回会移动它）
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-2 font-normal">源</th>
              <th className="text-left py-2 font-normal">级别</th>
              <th className="text-right py-2 font-normal">可信度</th>
              <th className="text-right py-2 font-normal">采纳</th>
              <th className="text-right py-2 font-normal">驳回</th>
              <th className="text-left py-2 font-normal pl-3">变化</th>
            </tr>
          </thead>
          <tbody>
            {semantic.sourcePriors.map((prior) => {
              const source = SOURCE_BY_ID.get(prior.sourceId);
              const delta = prior.reliability - (source?.reliability ?? prior.reliability);
              return (
                <tr key={prior.sourceId} className="border-t">
                  <td className="py-2">{source?.name ?? prior.sourceId}</td>
                  <td className="py-2">{source?.authorityLevel}</td>
                  <td className="py-2 text-right tabular-nums">{(prior.reliability * 100).toFixed(0)}%</td>
                  <td className="py-2 text-right tabular-nums">{prior.accepted}</td>
                  <td className="py-2 text-right tabular-nums">{prior.rejected}</td>
                  <td className="py-2 pl-3">
                    {Math.abs(delta) < 0.001 ? (
                      <span className="text-muted-foreground">未变化</span>
                    ) : (
                      <span className={delta > 0 ? "text-emerald-600" : "text-rose-600"}>
                        {delta > 0 ? "+" : ""}
                        {(delta * 100).toFixed(1)}pt
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">Playbook 规则（可解释的“经验”）</div>
        <div className="space-y-2">
          {semantic.playbookRules.map((rule) => (
            <div key={rule.ruleId} className="p-3 rounded border bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs leading-relaxed">{rule.rule}</div>
                <Badge
                  variant="outline"
                  className={`text-[10px] shrink-0 ${rule.source === "learned" ? "text-primary border-primary/30" : ""}`}
                >
                  {rule.source === "learned" ? "学习中生成" : "人工种子"}
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground mt-2">
                领域 {rule.domain} · 支持度 {rule.support} · 置信 {Math.round(rule.confidence * 100)}% · 命中 {rule.hits} 次 · 更新 {formatDateTime(rule.lastUsedAt)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">关键词语义权重</div>
          {semantic.keywordWeights.length === 0 ? (
            <div className="text-xs text-muted-foreground">
              尚无学习权重。在事件工作台点「确认」或「驳回」，这里会出现被加权/降权的关键词。
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {semantic.keywordWeights.map((kw) => (
                <span
                  key={kw.token}
                  className={`text-[11px] px-2 py-1 rounded border ${
                    kw.weight >= 0.5 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {kw.token} · {(kw.weight * 100).toFixed(0)}%
                </span>
              ))}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground mt-3">
            阈值：pass ≥ {semantic.thresholds.passScore} / warning ≥ {semantic.thresholds.warningScore} / 近重复 {semantic.thresholds.clusterSimilarity}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">人工反馈日志（audit）</div>
          {memory.feedback.length === 0 ? (
            <div className="text-xs text-muted-foreground">暂无反馈。</div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-auto">
              {[...memory.feedback].reverse().map((f) => (
                <div key={f.feedbackId} className="text-[11px] border-b pb-1.5">
                  <div>
                    <b>{f.decision}</b> · {f.eventId} · {formatDateTime(f.at)}
                  </div>
                  <div className="text-muted-foreground">
                    {f.reason || "未填写原因"}（scoreBefore {f.scoreBefore ?? "-"}）
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">事件记忆卡（episodic）</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {memory.episodic.map((card) => {
            const live = events.find((e) => e.eventId === card.eventId);
            return (
              <div key={card.eventId} className="p-3 rounded border bg-card text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium line-clamp-2">{card.title}</div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {card.riskLevel}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1.5">
                  主题 {card.clusterKey} · 决策 {card.decision} · 置信 {live?.confidence ?? "-"}%
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
