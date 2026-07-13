// Data mode: 'real' reads live DB only; 'sample' surfaces seeded sample rows.
import { useSyncExternalStore } from "react";

const KEY = "ttih:data-mode";
type Mode = "real" | "sample";
const listeners = new Set<() => void>();
let mode: Mode = "real";
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const v = window.localStorage.getItem(KEY);
  if (v === "sample" || v === "real") mode = v;
}

export function getDataMode(): Mode {
  hydrate();
  return mode;
}

export function setDataMode(m: Mode) {
  mode = m;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, m);
  listeners.forEach((l) => l());
}

export function useDataMode(): Mode {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getDataMode,
    () => "real",
  );
}
