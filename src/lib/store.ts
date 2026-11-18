import { useSyncExternalStore } from "react";
import type {
  CollectionTask,
  EvidenceItem,
  IntelligenceEvent,
  MemorySnapshot,
  PipelineRun,
  Report,
  SourcePrior,
} from "./types";
import { createMemory, applyFeedback, recordRun } from "./engine/memory";
import { runPipeline, type PipelineOutput, type SourceCoverage } from "./engine/pipeline";
import { generateReport } from "./engine/report";
import { SOURCES } from "./engine/source-registry";

const STORAGE_KEY = "ttih:v2";

export interface StoreState {
  ready: boolean;
  events: IntelligenceEvent[];
  evidence: EvidenceItem[];
  tasks: CollectionTask[];
  reports: Report[];
  runs: PipelineRun[];
  memory: MemorySnapshot;
  coverage: SourceCoverage[];
  lastRunId: string | null;
}

function emptyState(): StoreState {
  return {
    ready: false,
    events: [],
    evidence: [],
    tasks: [],
    reports: [],
    runs: [],
    memory: createMemory(),
    coverage: [],
    lastRunId: null,
  };
}

let state: StoreState = emptyState();
const listeners = new Set<() => void>();

function notify() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, ready: true, coverage: state.coverage }),
      );
    } catch {
      /* storage full — demo keeps working in memory */
    }
  }
  listeners.forEach((listener) => listener());
}

function applyOutput(output: PipelineOutput, previous: StoreState): StoreState {
  return {
    ready: true,
    events: output.events,
    evidence: output.evidence,
    tasks: output.tasks,
    reports: [output.report, ...previous.reports].slice(0, 12),
    runs: [output.run, ...previous.runs].slice(0, 12),
    memory: output.memory,
    coverage: output.coverage,
    lastRunId: output.run.runId,
  };
}

let initialized = false;
function ensureLoaded() {
  if (initialized) return;
  initialized = true;

  // 1) try persisted state
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<StoreState>;
        if (parsed.events && parsed.memory) {
          state = { ...emptyState(), ...parsed, ready: true };
          return;
        }
      }
    } catch {
      /* fall through to a fresh run */
    }
  }

  // 2) first load: run the pipeline once so the UI never shows mock numbers
  const output = runPipeline({ mode: "batch" });
  state = applyOutput(output, state);
  notify();
}

export const store = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot(): StoreState {
    ensureLoaded();
    return state;
  },
  /** Re-run the pipeline with the latest memory (what the "运行一次" button calls). */
  run(mode: "batch" | "manual" | "live" = "manual") {
    ensureLoaded();
    const output = runPipeline({ mode, memory: state.memory });
    state = applyOutput(output, state);
    notify();
  },
  /** Human decision → memory update → re-score (this is the self-evolution loop). */
  submitFeedback(input: {
    eventId: string;
    decision: "confirm" | "reject" | "promote" | "demote";
    reason: string;
    actor?: string;
  }) {
    ensureLoaded();
    const event = state.events.find((e) => e.eventId === input.eventId);
    if (!event) return;
    const sourceIds = Array.from(
      new Set(
        state.evidence
          .filter((e) => event.relatedEvidenceIds.includes(e.evidenceId))
          .map((e) => e.sourceId),
      ),
    );
    const memory = applyFeedback(state.memory, {
      event,
      decision: input.decision,
      reason: input.reason,
      actor: input.actor ?? "内部用户",
      sourceIds,
      scoreBefore: event.confidence,
    });
    state = { ...state, memory };
    notify();
    // re-derive events with the updated priors so the effect is visible immediately
    const output = runPipeline({ mode: "manual", memory });
    state = applyOutput(output, state);
    notify();
  },
  updateEvent(eventId: string, patch: Partial<IntelligenceEvent>) {
    ensureLoaded();
    state = {
      ...state,
      events: state.events.map((e) =>
        e.eventId === eventId ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
      ),
    };
    notify();
  },
  saveReviewNote(eventId: string, note: string) {
    ensureLoaded();
    state = {
      ...state,
      events: state.events.map((e) =>
        e.eventId === eventId ? { ...e, reviewNote: note, updatedAt: new Date().toISOString() } : e,
      ),
    };
    notify();
  },
  updateEvidence(evidenceId: string, patch: Partial<EvidenceItem>) {
    ensureLoaded();
    state = {
      ...state,
      evidence: state.evidence.map((e) => (e.evidenceId === evidenceId ? { ...e, ...patch } : e)),
    };
    notify();
  },
  rerunTask(taskId: string) {
    // real semantics: re-running a source means re-running the pipeline for that source
    store.run("manual");
    return taskId;
  },
  addReport(report: Report) {
    ensureLoaded();
    state = { ...state, reports: [report, ...state.reports] };
    notify();
  },
  regenerateReport(type: "daily" | "weekly" | "topic") {
    ensureLoaded();
    const run = state.runs[0];
    if (!run) return null;
    const report = generateReport({
      events: state.events,
      evidence: state.evidence,
      run,
      memory: state.memory,
      type,
      now: new Date(),
    });
    state = { ...state, reports: [report, ...state.reports].slice(0, 12) };
    notify();
    return report;
  },
  reset() {
    const memory = createMemory();
    const output = runPipeline({ mode: "batch", memory });
    state = applyOutput(output, emptyState());
    notify();
  },
  sources: SOURCES,
};

export function useStore(): StoreState {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

export function useMemory(): MemorySnapshot {
  return useStore().memory;
}

export function topSourcesByReliability(memory: MemorySnapshot, limit = 5): SourcePrior[] {
  return [...memory.semantic.sourcePriors].sort((a, b) => b.reliability - a.reliability).slice(0, limit);
}

export { recordRun };
