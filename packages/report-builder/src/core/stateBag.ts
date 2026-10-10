import { deepEqual } from "./deepEqual";

/**
 * Per-widget key/value bag: the Memento a report captures from a widget on a live
 * page (filters, tab, sort, page) and seeds the widget with when it is rebuilt inside
 * a report. Framework layers wrap it (React: `useReportState`).
 */
export interface StateBag {
  get(key: string): unknown;
  /** No-op when `value` deep-equals the current value, so consumers can save on every render. */
  set(key: string, value: unknown): void;
  /** The same object until something changes, so it is safe as a store snapshot. */
  getAll(): Record<string, unknown>;
  clear(): void;
  subscribe(listener: () => void): () => void;
}

export const createStateBag = (initial: Record<string, unknown> = {}): StateBag => {
  let state: Record<string, unknown> = { ...initial };
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of listeners) l();
  };
  return {
    get: (key) => state[key],
    set: (key, value) => {
      if (deepEqual(state[key], value)) return;
      state = { ...state, [key]: value };
      notify();
    },
    getAll: () => state,
    clear: () => {
      if (Object.keys(state).length === 0) return;
      state = {};
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};
