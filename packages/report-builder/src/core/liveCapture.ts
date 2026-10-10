/**
 * Registry of "live" state capture functions. A widget mounted on its host page
 * registers a function returning its current state bag; the report inspector uses
 * it to offer "Update from live page" for a report block with the same key.
 */
export type LiveCaptureFn = () => Record<string, unknown>;

export interface LiveCaptureRegistry {
  register(key: string, capture: LiveCaptureFn): () => void;
  get(key: string): LiveCaptureFn | undefined;
  has(key: string): boolean;
  subscribe(listener: () => void): () => void;
}

export const createLiveCaptureRegistry = (): LiveCaptureRegistry => {
  const captures = new Map<string, LiveCaptureFn>();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of listeners) l();
  };
  return {
    register: (key, fn) => {
      captures.set(key, fn);
      notify();
      return () => {
        // Only remove our own registration; a newer mount may have replaced it
        if (captures.get(key) === fn) {
          captures.delete(key);
          notify();
        }
      };
    },
    get: (key) => captures.get(key),
    has: (key) => captures.has(key),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

/** Key for a widget instance: what it is plus which entity it shows. */
export const liveCaptureKey = (type: string, instanceId?: string): string =>
  `${type}:${instanceId ?? ""}`;
