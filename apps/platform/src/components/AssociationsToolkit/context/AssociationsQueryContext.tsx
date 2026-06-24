import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import type { Dispatch, ReactNode } from "react";
import type { DocumentNode } from "graphql";
import { useLocation, useNavigate } from "react-router-dom";
import type { Facet } from "../../Facets/facetsTypes";
import {
  DEFAULT_TABLE_SORTING_STATE,
  DEFAULT_TABLE_PAGE_INDEX,
  DEFAULT_TABLE_PAGE_SIZE,
  serializeSorting,
  deserializeSorting,
} from "../associationsUtils";
import { aotfReducer, createInitialState } from "./aotfReducer";
import {
  aggregationClick,
  resetDataSourceControl,
  resetToInitialState,
  setDataSourceControl,
  setEnableIndirect,
} from "./aotfActions";
import type { Action, QueryState, Pagination, Sorting } from "../types";
import { ENTITY } from "../types";

const rowEntityMap: Partial<Record<ENTITY, ENTITY>> = {
  [ENTITY.TARGET]: ENTITY.DISEASE,
  [ENTITY.DISEASE]: ENTITY.TARGET,
};

// Compact facet serialization: "id~label~category" per facet, "|" between facets.
// ~ is safe — it doesn't appear in EFO IDs, Ensembl IDs, or typical bio entity names.
function serializeFacets(facets: Facet[]): string {
  return facets.map(f => [f.id, f.label, f.category].join("~")).join("|");
}

function deserializeFacets(s: string): Facet[] {
  if (!s) return [];
  return s
    .split("|")
    .map(part => {
      const segs = part.split("~");
      if (!segs[0]) return null;
      const id = segs[0];
      const category = segs.length > 2 ? segs[segs.length - 1] : "";
      const label =
        segs.length > 1 ? segs.slice(1, segs.length > 2 ? -1 : undefined).join("~") : id;
      return { id, label, category, highlights: [], score: 0 } as Facet;
    })
    .filter((f): f is Facet => f !== null);
}

// Full shape exposed to consumers — reducer state + URL-backed fields
export interface QueryContextState extends QueryState {
  id: string;
  entity: ENTITY;
  entityToGet: ENTITY;
  query: DocumentNode;
  pagination: Pagination;
  sorting: Sorting;
  entitySearch: string;
  facetFilters: Facet[];
  facetFiltersIds: string[];
}

export interface QueryContextDispatch {
  dispatch: Dispatch<Action>;
  handlePaginationChange: (updater: (prev: Pagination) => Pagination) => void;
  handleSortingChange: (fn: () => Sorting) => void;
  resetSorting: () => void;
  handleAggregationClick: (aggregation: string) => void;
  resetDatasourceControls: () => void;
  resetToInitialPagination: () => void;
  updateDataSourceControls: (
    id: string,
    weight: number,
    required: boolean,
    aggregation: string
  ) => void;
  facetFilterSelect: (facets: Facet[]) => void;
  setEnableIndirect: (value: boolean) => void;
  handleEntitySearch: (value: string) => void;
}

const AssociationsQueryStateContext = createContext<QueryContextState | null>(null);
const AssociationsQueryDispatchContext = createContext<QueryContextDispatch | null>(null);

interface AssociationsQueryProviderProps {
  children: ReactNode;
  id: string;
  entity: ENTITY;
  query: DocumentNode;
}

export function AssociationsQueryProvider({
  children,
  id,
  entity,
  query,
}: AssociationsQueryProviderProps) {
  const [state, dispatch] = useReducer(aotfReducer, { entity }, createInitialState);
  const hasRendered = useRef(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Always-current location ref — avoids stale closures in callbacks
  const locationRef = useRef(location);
  locationRef.current = location;

  // --- URL state (read from location on every render) ---

  // Parse URL params once per location change, then extract raw strings.
  // Using raw primitive strings as memo deps (not the URLSearchParams object) means
  // memos that return arrays/objects only recompute when *their* specific param changed —
  // not when an unrelated param (e.g. `focus`) changes.
  const sp = new URLSearchParams(location.search);
  const pageRaw      = sp.get("page")     ?? "";
  const pageSizeRaw  = sp.get("pageSize") ?? "";
  const sortRaw      = sp.get("sort")     ?? "";
  const entitySearch = sp.get("q")        ?? "";
  const facetsRaw    = sp.get("facets")   ?? "";

  const pageIndex = useMemo(() => {
    const n = parseInt(pageRaw, 10);
    return isNaN(n) || n < 0 ? DEFAULT_TABLE_PAGE_INDEX : n;
  }, [pageRaw]);

  const pageSize = useMemo(() => {
    const n = parseInt(pageSizeRaw, 10);
    return isNaN(n) || n <= 0 ? DEFAULT_TABLE_PAGE_SIZE : n;
  }, [pageSizeRaw]);

  // sortRaw / facetsRaw are primitive strings → React compares by value → stable references
  const sorting: Sorting = useMemo(
    () => (sortRaw ? deserializeSorting(sortRaw) : DEFAULT_TABLE_SORTING_STATE),
    [sortRaw]
  );

  const facetFilters: Facet[] = useMemo(
    () => (facetsRaw ? deserializeFacets(facetsRaw) : []),
    [facetsRaw]
  );

  const facetFiltersIds = useMemo(() => facetFilters.map(f => f.id), [facetFilters]);
  const pagination: Pagination = useMemo(() => ({ pageIndex, pageSize }), [pageIndex, pageSize]);

  // --- Single batched URL writer — always reads from ref, always single navigate call ---

  const updateUrlParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(locationRef.current.search);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      navigate({ pathname: locationRef.current.pathname, search: params.toString() });
    },
    [navigate]
  );

  // Reset all URL-backed state + reducer when entity ID changes
  useEffect(() => {
    if (hasRendered.current) {
      dispatch(resetToInitialState());
      updateUrlParams({
        page: null,
        sort: null,
        q: null,
        facets: null,
      });
    }
    hasRendered.current = true;
  }, [id]);

  // --- Dispatch callbacks ---

  const handlePaginationChange = useCallback(
    (updater: (prev: Pagination) => Pagination) => {
      const params = new URLSearchParams(locationRef.current.search);
      const currentPag: Pagination = {
        pageIndex:
          parseInt(params.get("page") ?? "", 10) || DEFAULT_TABLE_PAGE_INDEX,
        pageSize:
          parseInt(params.get("pageSize") ?? "", 10) || DEFAULT_TABLE_PAGE_SIZE,
      };
      const newPag = updater(currentPag);
      updateUrlParams({
        page: newPag.pageIndex === DEFAULT_TABLE_PAGE_INDEX ? null : String(newPag.pageIndex),
        pageSize:
          newPag.pageSize === DEFAULT_TABLE_PAGE_SIZE ? null : String(newPag.pageSize),
      });
    },
    [updateUrlParams]
  );

  const handleSortingChange = useCallback(
    (fn: () => Sorting) => {
      const newSorting = fn();
      const params = new URLSearchParams(locationRef.current.search);
      const currentSort = deserializeSorting(
        params.get("sort") ?? serializeSorting(DEFAULT_TABLE_SORTING_STATE)
      );
      const resolved =
        newSorting[0].id === currentSort[0].id ? DEFAULT_TABLE_SORTING_STATE : newSorting;
      updateUrlParams({
        sort:
          resolved === DEFAULT_TABLE_SORTING_STATE
            ? null
            : serializeSorting(resolved),
        page: null,
      });
    },
    [updateUrlParams]
  );

  const resetSorting = useCallback(() => {
    updateUrlParams({ sort: null });
  }, [updateUrlParams]);

  const handleAggregationClick = useCallback(
    (aggregation: string) => {
      dispatch(aggregationClick(aggregation));
      updateUrlParams({ page: null });
    },
    [updateUrlParams]
  );

  const resetDatasourceControls = useCallback(() => {
    dispatch(resetDataSourceControl());
    updateUrlParams({ page: null });
  }, [updateUrlParams]);

  const resetToInitialPagination = useCallback(() => {
    updateUrlParams({ page: null });
  }, [updateUrlParams]);

  const updateDataSourceControls = useCallback(
    (colId: string, weight: number, required: boolean, aggregation: string) => {
      dispatch(setDataSourceControl(colId, weight, required, aggregation));
      updateUrlParams({ page: null });
    },
    [updateUrlParams]
  );

  const facetFilterSelect = useCallback(
    (facets: Facet[]) => {
      updateUrlParams({
        facets: facets.length ? serializeFacets(facets) : null,
        page: null,
      });
    },
    [updateUrlParams]
  );

  const handleSetEnableIndirect = useCallback((value: boolean) => {
    dispatch(setEnableIndirect(value));
  }, []);

  const handleEntitySearch = useCallback(
    (value: string) => {
      updateUrlParams({ q: value || null, page: null });
    },
    [updateUrlParams]
  );

  // --- Context values ---

  const queryState = useMemo<QueryContextState>(
    () => ({
      ...state,
      id,
      entity,
      entityToGet: rowEntityMap[entity] ?? ENTITY.TARGET,
      query,
      pagination,
      sorting,
      entitySearch,
      facetFilters,
      facetFiltersIds,
    }),
    [state, id, entity, query, pagination, sorting, entitySearch, facetFilters, facetFiltersIds]
  );

  const queryDispatch = useMemo<QueryContextDispatch>(
    () => ({
      dispatch,
      handlePaginationChange,
      handleSortingChange,
      resetSorting,
      handleAggregationClick,
      resetDatasourceControls,
      resetToInitialPagination,
      updateDataSourceControls,
      facetFilterSelect,
      setEnableIndirect: handleSetEnableIndirect,
      handleEntitySearch,
    }),
    [
      handlePaginationChange,
      handleSortingChange,
      resetSorting,
      handleAggregationClick,
      resetDatasourceControls,
      resetToInitialPagination,
      updateDataSourceControls,
      facetFilterSelect,
      handleSetEnableIndirect,
      handleEntitySearch,
    ]
  );

  return (
    <AssociationsQueryStateContext.Provider value={queryState}>
      <AssociationsQueryDispatchContext.Provider value={queryDispatch}>
        {children}
      </AssociationsQueryDispatchContext.Provider>
    </AssociationsQueryStateContext.Provider>
  );
}

export function useAotfQueryState(): QueryContextState {
  const ctx = useContext(AssociationsQueryStateContext);
  if (!ctx) throw new Error("useAotfQueryState must be used within AssociationsQueryProvider");
  return ctx;
}

export function useAotfQueryDispatch(): QueryContextDispatch {
  const ctx = useContext(AssociationsQueryDispatchContext);
  if (!ctx) throw new Error("useAotfQueryDispatch must be used within AssociationsQueryProvider");
  return ctx;
}
