// Global time-window filter shared by header + module pages.
import { useSyncExternalStore } from "react";

export type RangeKey = "7d" | "30d" | "90d" | "all";
const KEY = "ttih:date-range";
const listeners = new Set<() => void>();
let value: RangeKey = "30d";
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const v = window.localStorage.getItem(KEY);
  if (v === "7d" || v === "30d" || v === "90d" || v === "all") value = v;
}

export function getDateRange(): RangeKey {
  hydrate();
  return value;
}

export function setDateRange(v: RangeKey) {
  value = v;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, v);
  listeners.forEach((l) => l());
}

export function useDateRange(): RangeKey {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getDateRange,
    () => "30d",
  );
}

export function rangeStartISO(range: RangeKey): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86400000).toISOString();
}

export const RANGE_LABEL: Record<RangeKey, string> = {
  "7d": "近 7 天",
  "30d": "近 30 天",
  "90d": "近 90 天",
  all: "全部时间",
};
