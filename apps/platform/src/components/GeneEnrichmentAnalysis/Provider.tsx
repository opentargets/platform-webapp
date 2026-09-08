import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { usePermissions } from "ui";
import { fetchLibrariesFailure, fetchLibrariesRequest, fetchLibrariesSuccess } from "./actions";
import { PATHWAYS_API_BASE_URL } from "./config";
import { geneEnrichmentReducer, initialState } from "./reducer";
import type { Action, State } from "./types";

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

  useEffect(() => {
    if (!isPartnerPreview) return;
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
