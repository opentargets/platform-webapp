import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { usePermissions } from "ui";
import {
  fetchLibrariesFailure,
  fetchLibrariesRequest,
  fetchLibrariesSuccess,
  hydrateRunHistory,
} from "./actions";
import { PATHWAYS_API_BASE_URL } from "./config";
import { geneEnrichmentReducer, initialState } from "./reducer";
import type { Action, State } from "./types";
import { loadRunHistory, saveRunHistory } from "./utils/runHistoryStorage";

const PATHWAYS_API_URL = `${PATHWAYS_API_BASE_URL}/api/gsea/libraries`;

/*****************
 * CONTEXTS *
 *****************/

const GeneEnrichmentStateContext = createContext<State | undefined>(undefined);
const GeneEnrichmentDispatchContext = createContext<React.Dispatch<Action> | undefined>(undefined);

/*****************
 * PROVIDER *
 *****************/

interface GeneEnrichmentProviderProps {
  children: ReactNode;
}

export function GeneEnrichmentProvider({ children }: GeneEnrichmentProviderProps): ReactElement {
  const [state, dispatch] = useReducer(geneEnrichmentReducer, initialState);
  const { isPartnerPreview } = usePermissions();
  const hasHydratedRef = useRef(false);

  // Restore run history persisted earlier in this tab (IndexedDB — GSEA
  // results are too large for sessionStorage). This Context only survives
  // client-side route changes within one page load, so a hard navigation
  // (typed URL, refresh, new tab) needs this to bring history back.
  useEffect(() => {
    let cancelled = false;
    loadRunHistory().then(persisted => {
      if (cancelled) return;
      hasHydratedRef.current = true;
      if (persisted) {
        dispatch(hydrateRunHistory(persisted.runs, persisted.activeRunId));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change, but only once hydration has been attempted —
  // otherwise this would overwrite real persisted history with the empty
  // initial state during the brief async gap before loadRunHistory resolves.
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    saveRunHistory({ runs: state.runs, activeRunId: state.activeRunId });
  }, [state.runs, state.activeRunId]);

  useEffect(() => {
    // if (!isPartnerPreview) return;
    async function fetchLibraries() {
      dispatch(fetchLibrariesRequest());
      try {
        const response = await fetch(PATHWAYS_API_URL);
        const data = await response.json();
        dispatch(fetchLibrariesSuccess(data));
      } catch (error) {
        dispatch(
          fetchLibrariesFailure(error instanceof Error ? error.message : "Error fetching libraries")
        );
      }
    }
    fetchLibraries();
  }, [isPartnerPreview]);

  return (
    <GeneEnrichmentStateContext.Provider value={state}>
      <GeneEnrichmentDispatchContext.Provider value={dispatch}>
        {children}
      </GeneEnrichmentDispatchContext.Provider>
    </GeneEnrichmentStateContext.Provider>
  );
}

/*****************
 * HOOKS *
 *****************/

/**
 * Hook to access the Gene Enrichment state
 */
export function useGeneEnrichmentState(): State {
  const context = useContext(GeneEnrichmentStateContext);
  if (context === undefined) {
    throw new Error("useGeneEnrichmentState must be used within a GeneEnrichmentProvider");
  }
  return context;
}

/**
 * Hook to access the Gene Enrichment dispatch function
 */
export function useGeneEnrichmentDispatch(): React.Dispatch<Action> {
  const context = useContext(GeneEnrichmentDispatchContext);
  if (context === undefined) {
    throw new Error("useGeneEnrichmentDispatch must be used within a GeneEnrichmentProvider");
  }
  return context;
}

/**
 * Hook to access both state and dispatch
 */
export function useGeneEnrichment(): [State, React.Dispatch<Action>] {
  const state = useGeneEnrichmentState();
  const dispatch = useGeneEnrichmentDispatch();
  return [state, dispatch];
}
