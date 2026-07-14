import { useSyncExternalStore } from 'react';
import type { IntelligenceEvent, EvidenceItem, CollectionTask, Report } from './types';
import { MOCK_EVENTS, MOCK_EVIDENCE, MOCK_TASKS, MOCK_REPORTS } from './mock-data';

const STORAGE_KEY = 'ttih:v1';

interface State {
  events: IntelligenceEvent[];
  evidence: EvidenceItem[];
  tasks: CollectionTask[];
  reports: Report[];
}

function initialState(): State {
  return {
    events: JSON.parse(JSON.stringify(MOCK_EVENTS)),
    evidence: JSON.parse(JSON.stringify(MOCK_EVIDENCE)),
    tasks: JSON.parse(JSON.stringify(MOCK_TASKS)),
    reports: JSON.parse(JSON.stringify(MOCK_REPORTS)),
  };
}

let state: State = initialState();
const listeners = new Set<() => void>();

function load() {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<State>;
      state = { ...initialState(), ...parsed };
    }
  } catch {
    /* ignore */
  }
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function notify() {
  persist();
  listeners.forEach((l) => l());
}

let loaded = false;
function ensureLoaded() {
  if (loaded) return;
  loaded = true;
  load();
}

export const store = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot(): State {
    ensureLoaded();
    return state;
  },
  updateEvent(id: string, patch: Partial<IntelligenceEvent>) {
    state = {
      ...state,
      events: state.events.map((e) =>
        e.eventId === id ? { ...e, ...patch, updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' ') } : e,
      ),
    };
    notify();
  },
  updateEvidence(id: string, patch: Partial<EvidenceItem>) {
    state = {
      ...state,
      evidence: state.evidence.map((e) => (e.evidenceId === id ? { ...e, ...patch } : e)),
    };
    notify();
  },
  rerunTask(taskId: string) {
    state = {
      ...state,
      tasks: state.tasks.map((t) =>
        t.taskId === taskId
          ? {
              ...t,
              status: 'success',
              runTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
              foundChange: true,
              rawItemCount: t.rawItemCount + Math.floor(Math.random() * 5) + 1,
              validItemCount: t.validItemCount + 1,
              errorMessage: undefined,
            }
          : t,
      ),
    };
    notify();
  },
  addReport(r: Report) {
    state = { ...state, reports: [r, ...state.reports] };
    notify();
  },
  reset() {
    state = initialState();
    notify();
  },
};

export function useStore(): State {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
