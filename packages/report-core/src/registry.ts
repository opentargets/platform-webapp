/**
 * Widget registry. `Out` is whatever the framework layer renders (ReactNode for
 * React); core never inspects it. `register` is synchronous so hosts can populate
 * the registry at boot; `resolve` is an optional lazy fallback the host supplies.
 */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface WidgetContext {
  inReport: boolean;
  blockId: string;
  view?: string;
}

export interface WidgetTableData {
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export interface WidgetReference {
  id: string;
  pmid?: string;
  doi?: string;
  url?: string;
  title: string;
  authors?: string[];
  journal?: string;
  year?: number;
}

export interface WidgetDefinition<P = Json, Out = unknown> {
  render: (props: P, ctx: WidgetContext) => Out;
  // Human-readable captured state (chips, provenance), for state a generic formatter can't read
  describeState?: (state: Record<string, unknown>) => string[];
  toTable?: (props: P, state?: Record<string, unknown>) => WidgetTableData | undefined;
  toSvg?: (el: HTMLElement) => string | undefined;
  references?: (props: P) => WidgetReference[];
  views?: string[];
}

/**
 * A keyed registry with change notification and an optional async resolver.
 * Generic over the entry so hosts can register their own definition shape while
 * they migrate to `WidgetDefinition`.
 */
export interface Registry<D> {
  register(type: string, def: D): () => void;
  get(type: string): D | undefined;
  has(type: string): boolean;
  keys(): string[];
  /** Async lookup: the registered entry, else the host resolver's, cached on success. */
  load(type: string): Promise<D | undefined>;
  subscribe(listener: () => void): () => void;
}

export interface RegistryOptions<D> {
  resolve?: (type: string) => Promise<D | undefined>;
  onDuplicate?: (type: string) => void;
}

export const createRegistry = <D>(options: RegistryOptions<D> = {}): Registry<D> => {
  const entries = new Map<string, D>();
  const pending = new Map<string, Promise<D | undefined>>();
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const l of listeners) l();
  };
  return {
    register: (type, def) => {
      if (entries.has(type)) options.onDuplicate?.(type);
      entries.set(type, def);
      notify();
      return () => {
        if (entries.get(type) === def) {
          entries.delete(type);
          notify();
        }
      };
    },
    get: (type) => entries.get(type),
    has: (type) => entries.has(type),
    keys: () => Array.from(entries.keys()),
    load: (type) => {
      const known = entries.get(type);
      if (known) return Promise.resolve(known);
      if (!options.resolve) return Promise.resolve(undefined);
      let inflight = pending.get(type);
      if (!inflight) {
        inflight = options
          .resolve(type)
          .then((def) => {
            if (def && !entries.has(type)) {
              entries.set(type, def);
              notify();
            }
            return def;
          })
          .finally(() => pending.delete(type));
        pending.set(type, inflight);
      }
      return inflight;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export type WidgetRegistry<Out = unknown> = Registry<WidgetDefinition<Json, Out>>;

export const createWidgetRegistry = <Out = unknown>(
  options: RegistryOptions<WidgetDefinition<Json, Out>> = {}
): WidgetRegistry<Out> => createRegistry<WidgetDefinition<Json, Out>>(options);
