/**
 * 引擎自检脚本（不依赖测试框架，用 esbuild 打包后 node 直接跑）：
 *   npm run verify
 * 输出：流水线各阶段计数、事件与参考意见、报告前几行、反馈闭环后的源先验变化。
 */
import { runPipeline } from "@/lib/engine/pipeline";
import { applyFeedback, createMemory } from "@/lib/engine/memory";
import { formatDateTime } from "@/lib/engine/dates";

const now = new Date("2026-11-18T10:00:00+08:00");

function line(char = "─", len = 78) {
  return char.repeat(len);
}

const first = runPipeline({ mode: "live", memory: createMemory(), now });
console.log(line("="));
console.log("RUN 1", first.run.runId, "dataOrigin=", first.run.dataOrigin, "at", formatDateTime(first.run.finishedAt));
console.log(line("="));
for (const s of first.run.stages) {
  console.log(
    `${s.stageId.padEnd(10)} in=${String(s.inputCount).padStart(3)} out=${String(s.outputCount).padStart(3)} ${String(s.durationMs).padStart(4)}ms  ${s.name}`,
  );
}
console.log(line());
console.log(
  `docs=${first.run.rawDocuments} newEvidence=${first.run.newEvidence} dup=${first.run.duplicateEvidence} blocked=${first.run.lowQualityBlocked} events=${first.run.eventsCreated}`,
);
console.log(`源覆盖：${first.coverage.filter((c) => c.docs > 0).length}/${first.coverage.length} 个源本轮有产出`);
console.log(
  `证据状态分布：${Object.entries(
    first.evidence.reduce<Record<string, number>>((a, e) => ((a[e.verificationStatus] = (a[e.verificationStatus] ?? 0) + 1), a), {}),
  )
    .map(([k, v]) => `${k}=${v}`)
    .join(" ")}`,
);
console.log(line());

const sorted = [...first.events].sort(
  (a, b) => ({ P1: 0, P2: 1, P3: 2 }[a.riskLevel] ?? 3) - ({ P1: 0, P2: 1, P3: 2 }[b.riskLevel] ?? 3),
);
for (const e of sorted.slice(0, 6)) {
  console.log(`\n[${e.riskLevel}] ${e.eventId}  ${e.title}`);
  console.log(
    `  type=${e.eventType} status=${e.status} confidence=${e.confidence?.toFixed(3)} evidence=${e.evidenceCount} sources=${e.distinctSourceCount} modules=${e.affectedModules.join(",")}`,
  );
  if (e.opinion) {
    console.log(`  立场=${e.opinion.stance} ｜ ${e.opinion.headline}`);
    console.log(`  依据: ${e.opinion.reasoning[0]}`);
    console.log(`  证伪: ${e.opinion.falsifiers[0]}`);
  }
  if (e.conflicts?.length) console.log(`  ⚠ 冲突 ${e.conflicts.length} 处：${e.conflicts[0].note}`);
}

console.log("\n" + line());
console.log("REPORT 摘要：", first.report.summary);
console.log(line());
console.log(first.report.markdown.split("\n").slice(0, 18).join("\n"));
console.log(`... (共 ${first.report.markdown.split("\n").length} 行 Markdown)`);

// ── 反馈闭环：确认一条事件后，观察源先验与规则的变化 ──
const top = sorted[0];
if (top) {
  const sourceIds = Array.from(
    new Set(
      first.evidence.filter((e) => top.relatedEvidenceIds.includes(e.evidenceId)).map((e) => e.sourceId),
    ),
  );
  const before = first.memory.semantic.sourcePriors.find((p) => p.sourceId === sourceIds[0]);
  const after = applyFeedback(first.memory, {
    event: top,
    decision: "confirm",
    reason: "自检脚本确认（用于验证闭环）",
    actor: "verify-script",
    sourceIds,
    scoreBefore: top.confidence,
    now,
  });
  const afterPrior = after.semantic.sourcePriors.find((p) => p.sourceId === sourceIds[0]);
  const learned = after.semantic.playbookRules.filter((r) => r.source === "learned");
  console.log("\n" + line("="));
  console.log("FEEDBACK 闭环自检（对最高优先级事件 confirm）");
  console.log(`  event=${top.eventId} 涉及源=${sourceIds.join(",")}`);
  console.log(
    `  源先验 ${sourceIds[0]}: ${before?.reliability?.toFixed(3) ?? "-"} → ${afterPrior?.reliability?.toFixed(3) ?? "-"}（样本 ${before?.samples ?? 0} → ${afterPrior?.samples ?? 0}）`,
  );
  console.log(`  memory version: ${first.memory.version} → ${after.version}；学习得到的 playbook 规则 ${learned.length} 条`);
  console.log(`  episodic decision: ${after.episodic.find((e) => e.eventId === top.eventId)?.decision ?? "-"}`);
}

// ── 第二遍：带记忆再跑，验证"新/旧"区分与幂等 ──
const second = runPipeline({ mode: "live", memory: first.memory, now: new Date(now.getTime() + 60 * 60 * 1000) });
console.log("\n" + line("="));
console.log("RUN 2（1 小时后，带第一轮记忆）");
console.log(
  `  docs=${second.run.rawDocuments} newEvidence=${second.run.newEvidence} dup=${second.run.duplicateEvidence} events=${second.run.eventsCreated}`,
);
console.log(`  seenHashes 累积 ${second.memory.working.seenHashes.length} 条，openClusterKeys=${second.memory.working.openClusterKeys.length}`);
console.log(line("="));
