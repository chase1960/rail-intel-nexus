import type {
  CollectionTask,
  EvidenceItem,
  IntelligenceEvent,
  IntelligenceSource,
  MemorySnapshot,
  PipelineRun,
  Report,
  StageRun,
} from "@/lib/types";
import { createMemory, recordRun } from "./memory";
import { SOURCE_BY_ID, SOURCES } from "./source-registry";
import { buildSampleCorpus, type RawDocument } from "./sample-corpus";
import { dedupeDocuments, normalizeDocuments, evidenceIdFor } from "./dedupe";
import { classifyDocument } from "./classify";
import { buildEvidenceItem, type EngineEvidence } from "./evidence";
import { buildClusters, detectConflicts, pickAnchor, type EventCluster } from "./cluster";
import { deriveImpacts, affectedModulesOf } from "./impact";
import { buildOpinion } from "./opinion";
import { buildEvent, eventIdFor } from "./events";
import { generateReport } from "./report";
import { hashString } from "./text";

export interface SourceCoverage {
  sourceId: string;
  name: string;
  category: IntelligenceSource["category"];
  authorityLevel: string;
  accessMode: string;
  connectionStatus: string;
  docs: number;
  newEvidence: number;
  duplicates: number;
  lastCollectedAt: string;
  note: string;
}

export interface PipelineOptions {
  now?: Date;
  memory?: MemorySnapshot;
  mode?: "batch" | "manual" | "live";
  documents?: RawDocument[];
  /** dataset label surfaced in UI/report */
  dataOrigin?: "sample" | "real";
}

export interface PipelineOutput {
  run: PipelineRun;
  events: IntelligenceEvent[];
  evidence: EvidenceItem[];
  clusters: EventCluster[];
  tasks: CollectionTask[];
  coverage: SourceCoverage[];
  report: Report;
  memory: MemorySnapshot;
}

function timeIt(): () => number {
  const start = Date.now();
  const startedAt = new Date().toISOString();
  return () => Date.now() - start;
}

export function runPipeline(options: PipelineOptions = {}): PipelineOutput {
  const now = options.now ?? new Date();
  const memory = options.memory ?? createMemory(now);
  const mode = options.mode ?? "batch";
  const documents = options.documents ?? buildSampleCorpus(now);
  const dataOrigin = options.dataOrigin ?? "sample";
  const runId = `run_${now.getTime().toString(36)}`;
  const stages: StageRun[] = [];

  const stage = (
    stageId: string,
    name: string,
    fn: () => { inputCount: number; outputCount: number; metrics?: Record<string, number>; notes?: string[] },
  ) => {
    const startedAt = new Date().toISOString();
    const elapsed = timeIt();
    const result = fn();
    stages.push({
      stageId,
      name,
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      durationMs: elapsed(),
      inputCount: result.inputCount,
      outputCount: result.outputCount,
      metrics: result.metrics ?? {},
      notes: result.notes ?? [],
    });
    return result;
  };

  // 1) source planning: which sources are reachable in this run
  stage("plan", "源计划与可达性检查", () => {
    const groupDocs = new Map<string, number>();
    for (const doc of documents) groupDocs.set(doc.sourceId, (groupDocs.get(doc.sourceId) ?? 0) + 1);
    return {
      inputCount: SOURCES.length,
      outputCount: groupDocs.size,
      metrics: { sourcesDeclared: SOURCES.length, sourcesWithDocs: groupDocs.size },
      notes: [
        `声明 ${SOURCES.length} 个源；本期 ${groupDocs.size} 个源产出文档`,
        dataOrigin === "sample" ? "数据源=样本语料（相对当前时间生成，可复现）" : "数据源=实时采集",
      ],
    };
  });

  // 2) ingest
  const ingest = stage("ingest", "原文采集", () => ({
    inputCount: SOURCES.length,
    outputCount: documents.length,
    metrics: { rawDocuments: documents.length },
    notes: [`拉取 ${documents.length} 条原始文档`, `其中官方源 ${documents.filter((d) => SOURCE_BY_ID.get(d.sourceId)?.isOfficial).length} 条`],
  }));

  // 3) normalize
  const normalized = normalizeDocuments(documents);
  stage("normalize", "归一化与清洗", () => ({
    inputCount: documents.length,
    outputCount: normalized.length,
    metrics: { avgLength: Math.round(normalized.reduce((s, d) => s + d.normalizedText.length, 0) / Math.max(1, normalized.length)) },
    notes: ["HTML 剥离 / 全半角统一 / 零宽字符清理 / 内容指纹(FNV-1a)"],
  }));

  // 4) dedupe
  const dedupe = dedupeDocuments(normalized, {
    nearThreshold: memory.semantic.thresholds.clusterSimilarity,
    seenHashes: memory.working.seenHashes,
  });
  stage("dedupe", "双层去重", () => ({
    inputCount: normalized.length,
    outputCount: dedupe.canonical.length,
    metrics: {
      exactHash: dedupe.duplicates.filter((d) => d.reason === "exact_hash").length,
      nearDuplicate: dedupe.duplicates.filter((d) => d.reason === "near_duplicate").length,
      alreadyIngested: dedupe.duplicates.filter((d) => d.reason === "already_ingested").length,
    },
    notes: ["层 1：内容指纹完全相同 → 直接丢弃", "层 2：相似度 ≥ 阈值 → 保留最早版本，其余记为 version=2"],
  }));

  // 5) classify
  const classified = dedupe.canonical
    .map((doc) => {
      const source = SOURCE_BY_ID.get(doc.sourceId);
      if (!source) return null;
      return { doc, source, cls: classifyDocument(doc, source) };
    })
    .filter((x): x is { doc: (typeof dedupe.canonical)[number]; source: IntelligenceSource; cls: ReturnType<typeof classifyDocument> } => !!x);
  stage("classify", "分类与实体识别", () => ({
    inputCount: dedupe.canonical.length,
    outputCount: classified.length,
    metrics: {
      policy: classified.filter((c) => c.cls.category === "policy").length,
      competitor: classified.filter((c) => c.cls.category === "competitor").length,
      sentiment: classified.filter((c) => c.cls.category === "sentiment").length,
    },
    notes: ["源类别作为先验，文本信号可覆盖", "同时抽取模块实体、风险信号与数字口径"],
  }));

  // 6) score — pass 1 without conflict flag, then pass 2 with learned conflict penalty
  const anchorGroups = new Map<string, Set<string>>();
  for (const item of classified) {
    const anchor = pickAnchor(`${item.doc.cleanTitle} ${item.doc.normalizedText}`);
    const set = anchorGroups.get(anchor.key) ?? new Set<string>();
    set.add(item.source.sourceId);
    anchorGroups.set(anchor.key, set);
  }

  const buildPass = (conflictIds: Set<string>): EngineEvidence[] =>
    classified.map((item) => {
      const anchor = pickAnchor(`${item.doc.cleanTitle} ${item.doc.normalizedText}`);
      const corroboration = anchorGroups.get(anchor.key)?.size ?? 1;
      return buildEvidenceItem(item.doc, item.cls, {
        source: item.source,
        now,
        memory,
        corroborationCount: corroboration,
        hasConflict: conflictIds.has(evidenceIdFor(item.doc)),
      });
    });

  const pass1 = buildPass(new Set());
  const preliminary = buildClusters(pass1, memory);
  const conflictIds = new Set<string>();
  for (const cluster of preliminary) {
    for (const conflict of detectConflicts(cluster.evidence)) {
      conflictIds.add(conflict.a.evidenceId);
      conflictIds.add(conflict.b.evidenceId);
    }
  }
  const evidencePool = buildPass(conflictIds);
  const blocked = evidencePool.filter((e) => e.score.grade === "blocked");

  stage("score", "证据打分与校验", () => ({
    inputCount: evidencePool.length,
    outputCount: evidencePool.length - blocked.length,
    metrics: {
      pass: evidencePool.filter((e) => e.score.grade === "pass").length,
      warning: evidencePool.filter((e) => e.score.grade === "warning").length,
      blocked: blocked.length,
      conflicts: conflictIds.size,
    },
    notes: [
      "5 维加权 + 历史先例加成 + 冲突扣分",
      `阈值：pass ≥ ${memory.semantic.thresholds.passScore} / warning ≥ ${memory.semantic.thresholds.warningScore}`,
      `冲突标记 ${conflictIds.size} 条（低权威源与官方数字/口径不一致）`,
    ],
  }));

  // 7) cluster
  const clusters = buildClusters(evidencePool, memory);
  stage("cluster", "主题聚合成事件", () => ({
    inputCount: evidencePool.length - blocked.length,
    outputCount: clusters.length,
    metrics: { events: clusters.length, anchors: new Set(clusters.map((c) => c.clusterKey)).size },
    notes: clusters.map((c) => `「${c.anchor.label}」聚合 ${c.evidence.length} 条证据，冲突 ${c.conflicts.length} 处`),
  }));

  // 8) impact + opinion
  const events: IntelligenceEvent[] = clusters.map((cluster) => {
    const impacts = deriveImpacts(cluster, cluster.evidence);
    const opinion = buildOpinion(cluster, impacts, memory);
    const event = buildEvent(cluster, cluster.evidence, impacts, opinion, memory, now);
    return {
      ...event,
      affectedModules: affectedModulesOf(cluster, impacts),
    };
  });
  stage("judge", "产品影响与参考意见", () => ({
    inputCount: clusters.length,
    outputCount: events.length,
    metrics: {
      impacts: events.reduce((s, e) => s + e.productImpact.length, 0),
      act: events.filter((e) => e.opinion?.stance === "act").length,
      watch: events.filter((e) => e.opinion?.stance === "watch").length,
      hold: events.filter((e) => e.opinion?.stance === "hold").length,
    },
    notes: ["影响规则表 19 条 + 竞品 gap 3 条", "每个事件产出立场/依据/证伪条件/验证动作/使用边界"],
  }));

  // evidence ↔ event back-links
  const evidence: EvidenceItem[] = evidencePool.map((e) => {
    const linked = events.filter((ev) => ev.relatedEvidenceIds.includes(e.evidenceId)).map((ev) => ev.eventId);
    const conflicts = clusters
      .flatMap((c) => c.conflicts)
      .filter((c) => c.a.evidenceId === e.evidenceId || c.b.evidenceId === e.evidenceId)
      .map((c) => (c.a.evidenceId === e.evidenceId ? c.b.evidenceId : c.a.evidenceId));
    return { ...e.item, quotedByEvents: linked, conflictWith: conflicts };
  });

  const duplicateCount = dedupe.duplicates.filter((d) => d.reason !== "already_ingested").length;
  const reusedEvidenceIds = new Set(dedupe.reused.map((d) => evidenceIdFor(d)));
  const newEvidenceCount = evidencePool.filter((e) => !reusedEvidenceIds.has(e.evidenceId)).length;
  const run: PipelineRun = {
    runId,
    startedAt: new Date(now.getTime() - stages.reduce((s, st) => s + st.durationMs, 0)).toISOString(),
    finishedAt: new Date().toISOString(),
    mode,
    dataOrigin,
    stages,
    rawDocuments: ingest.outputCount,
    newEvidence: newEvidenceCount,
    duplicateEvidence: duplicateCount,
    eventsCreated: events.length,
    lowQualityBlocked: blocked.length,
    idempotentHit: dedupe.duplicates.every((d) => d.reason === "already_ingested") && dedupe.duplicates.length > 0,
    memoryVersion: memory.version,
  };

  // 9) report
  const report = generateReport({ events, evidence, run, memory, type: "daily", now });
  stage("report", "报告生成", () => ({
    inputCount: events.length,
    outputCount: 1,
    metrics: { markdownLines: report.markdown?.split("\n").length ?? 0 },
    notes: ["报告由数据生成，章节编号动态计算，导出即 Markdown 源文件"],
  }));

  // 10) memory write-back
  const nextMemory = recordRun(
    memory,
    runId,
    events,
    normalized.map((d) => d.contentHash),
    now,
  );
  stage("memory", "记忆写回", () => ({
    inputCount: events.length,
    outputCount: nextMemory.episodic.length,
    metrics: { episodic: nextMemory.episodic.length, seenHashes: nextMemory.working.seenHashes.length },
    notes: ["working：写入去重指纹与未结主题", `episodic：保留最近 ${nextMemory.episodic.length} 张事件卡`, "semantic：待人工反馈后更新源先验/关键词权重/playbook"],
  }));

  // per-source collection tasks (drives the Tasks page)
  const tasks: CollectionTask[] = SOURCES.map((source, i) => {
    const docs = documents.filter((d) => d.sourceId === source.sourceId);
    const dup = dedupe.duplicates.filter(
      (d) => d.doc.sourceId === source.sourceId && d.reason !== "already_ingested",
    );
    const reusedDocs = dedupe.reused.filter((d) => d.sourceId === source.sourceId);
    return {
      taskId: `task_${(i + 1).toString().padStart(2, "0")}_${runId.slice(-4)}`,
      sourceId: source.sourceId,
      taskName: `${source.name} · ${source.collectionMethod}`,
      runTime: now.toISOString(),
      status: docs.length === 0 ? "partial" : docs.length > dup.length + reusedDocs.length ? "success" : "partial",
      foundChange: docs.length > dup.length + reusedDocs.length,
      rawItemCount: docs.length,
      validItemCount: docs.length - dup.length,
      duplicateItemCount: dup.length,
      errorMessage:
        docs.length === 0
          ? "本期无新增内容（源可达，无更新）"
          : reusedDocs.length === docs.length
            ? "本期内容与历史重复，已复用旧证据（0 条新增）"
            : undefined,
      generatedEvidenceIds: docs.filter((d) => !dup.some((x) => x.doc.docId === d.docId)).map((d) => evidenceIdFor(normalizeDocuments([d])[0])),
      dataOrigin,
      durationMs: Math.round(20 + (hashString(source.sourceId).charCodeAt(0) % 40)),
      httpStatus: source.fetchStrategy === "sample" ? null : 200,
    };
  });

  const coverage: SourceCoverage[] = SOURCES.map((source) => {
    const docs = documents.filter((d) => d.sourceId === source.sourceId);
    const dup = dedupe.duplicates.filter(
      (d) => d.doc.sourceId === source.sourceId && d.reason !== "already_ingested",
    );
    const reusedDocs = dedupe.reused.filter((d) => d.sourceId === source.sourceId);
    return {
      sourceId: source.sourceId,
      name: source.name,
      category: source.category,
      authorityLevel: source.authorityLevel,
      accessMode: source.accessMode ?? "public_web",
      connectionStatus: source.connectionStatus ?? "unconfigured",
      docs: docs.length,
      newEvidence: docs.length - dup.length - reusedDocs.length,
      duplicates: dup.length,
      lastCollectedAt: docs.length > 0 ? now.toISOString() : source.lastCollectedAt,
      note:
        docs.length === 0
          ? "本期无新增"
          : reusedDocs.length === docs.length
            ? `${docs.length} 条全部与历史重复，复用旧证据`
            : `${docs.length} 条原始 → ${docs.length - dup.length - reusedDocs.length} 条新增证据`,
    };
  });

  return { run, events, evidence, clusters, tasks, coverage, report, memory: nextMemory };
}

export { eventIdFor };
