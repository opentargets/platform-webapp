import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * Where the toolkit keeps its "URL" state (page, sort, facets, displayed table,
 * pinned rows, ...). On an entity page that's the real URL; inside a report it's
 * an in-memory copy seeded from the snapshot, so the embedded table neither reads
 * the host page's params nor navigates it.
 */
export interface AotfParamsStore {
  // Current search string. A primitive, so memos keyed on it only recompute when it changes
  search: string;
  // Always-fresh params for callbacks, avoiding stale closures
  getLatest: () => URLSearchParams;
  // null or "" removes the key
  set: (updates: Record<string, string | null>) => void;
}

const AotfParamsContext = createContext<AotfParamsStore | null>(null);

const applyUpdates = (
  current: string,
  updates: Record<string, string | null>
): URLSearchParams => {
  const params = new URLSearchParams(current);
  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  });
  return params;
};

export function AotfUrlParamsProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const locationRef = useRef(location);
  locationRef.current = location;

  const getLatest = useCallback(() => new URLSearchParams(locationRef.current.search), []);

  const set = useCallback(
    (updates: Record<string, string | null>) => {
      const params = applyUpdates(locationRef.current.search, updates);
      navigate({ pathname: locationRef.current.pathname, search: params.toString() });
    },
    [navigate]
  );

  const search = location.search.replace(/^\?/, "");
  const store = useMemo(() => ({ search, getLatest, set }), [search, getLatest, set]);

  return <AotfParamsContext.Provider value={store}>{children}</AotfParamsContext.Provider>;
}

export function AotfMemoryParamsProvider({
  initialSearch = "",
  children,
}: {
  initialSearch?: string;
  children: ReactNode;
}) {
  const [search, setSearch] = useState(initialSearch);
  const searchRef = useRef(search);

  const getLatest = useCallback(() => new URLSearchParams(searchRef.current), []);

  const set = useCallback((updates: Record<string, string | null>) => {
    searchRef.current = applyUpdates(searchRef.current, updates).toString();
    setSearch(searchRef.current);
  }, []);

  const store = useMemo(() => ({ search, getLatest, set }), [search, getLatest, set]);

  return <AotfParamsContext.Provider value={store}>{children}</AotfParamsContext.Provider>;
}

export function useAotfParams(): AotfParamsStore {
  const ctx = useContext(AotfParamsContext);
  if (!ctx) throw new Error("useAotfParams must be used within an Aotf*ParamsProvider");
  return ctx;
}

/**
 * One param as typed state. The value is memoized on the raw string, so arrays
 * keep their identity until the param actually changes; `initial` should be a
 * stable reference.
 */
export function useAotfParam<T>(
  name: string,
  initial: T,
  serialize: (value: T) => string,
  deserialize: (raw: string) => T
): [T, (value: T) => void] {
  const { search, set } = useAotfParams();
  const raw = new URLSearchParams(search).get(name) ?? "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => (raw ? deserialize(raw) : initial), [raw]);
  const setValue = useCallback((v: T) => set({ [name]: serialize(v) }), [set, name]);
  return [value, setValue];
}
