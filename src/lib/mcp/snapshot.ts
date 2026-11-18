import { runPipeline, type PipelineOutput } from "@/lib/engine/pipeline";
import { createMemory, applyFeedback } from "@/lib/engine/memory";
import type { MemorySnapshot } from "@/lib/types";

/**
 * MCP is stateless per call, so we keep a short-lived in-process cache of the
 * pipeline output. Every tool returns *engine-computed* results (not mock objects),
 * and the cache is rebuilt when it is older than 10 minutes or when feedback arrives.
 */
let cache: { at: number; origin: "sample" | "real"; output: PipelineOutput } | null = null;
let memory: MemorySnapshot = createMemory();

const TTL_MS = 10 * 60 * 1000;

export function getSnapshot(origin: "sample" | "real" = "sample"): PipelineOutput {
  if (cache && cache.origin === origin && Date.now() - cache.at < TTL_MS) return cache.output;
  const output = runPipeline({ mode: "live", memory, dataOrigin: origin });
  memory = output.memory;
  cache = { at: Date.now(), origin, output };
  return output;
}

export function invalidateSnapshot() {
  cache = null;
}

export function submitFeedback(input: Parameters<typeof applyFeedback>[1]) {
  const output = getSnapshot();
  memory = applyFeedback(output.memory, input);
  invalidateSnapshot();
  return getSnapshot();
}

export function currentMemory(): MemorySnapshot {
  return memory;
}
