import { createContext, useReducer, ReactNode, useMemo } from "react";

/**
 * State for enrichment map controls
 */
export interface EnrichmentMapControlsState {
  similarityThreshold: number;
  sizeBy: "significance" | "pathwaySize" | "geneCount";
  fdrThreshold: number;
  pValueThreshold: number;
  searchQuery: string;
  nesRange: [number, number];
  nesDataRange: { min: number; max: number };
}

/**
 * Action types for enrichment map controls
 */
export type EnrichmentMapControlsAction =
  | { type: "SET_SIMILARITY_THRESHOLD"; payload: number }
  | { type: "SET_SIZE_BY"; payload: "significance" | "pathwaySize" | "geneCount" }
  | { type: "SET_FDR_THRESHOLD"; payload: number }
  | { type: "SET_P_VALUE_THRESHOLD"; payload: number }
  | { type: "SET_SEARCH_QUERY"; payload: string }
  | { type: "SET_NES_RANGE"; payload: [number, number] }
  | { type: "INITIALIZE_NES_RANGE"; payload: { min: number; max: number } }
  | { type: "RESET_FILTERS" };

/**
 * Reducer for enrichment map controls state
 */
export function enrichmentMapControlsReducer(
  state: EnrichmentMapControlsState,
  action: EnrichmentMapControlsAction
): EnrichmentMapControlsState {
  switch (action.type) {
    case "SET_SIMILARITY_THRESHOLD":
      return { ...state, similarityThreshold: action.payload };

    case "SET_SIZE_BY":
      return { ...state, sizeBy: action.payload };

    case "SET_FDR_THRESHOLD":
      return { ...state, fdrThreshold: action.payload };

    case "SET_P_VALUE_THRESHOLD":
      return { ...state, pValueThreshold: action.payload };

    case "SET_SEARCH_QUERY":
      return { ...state, searchQuery: action.payload };

    case "SET_NES_RANGE":
      return { ...state, nesRange: action.payload };

    case "INITIALIZE_NES_RANGE":
      return {
        ...state,
        nesDataRange: action.payload,
        nesRange: [action.payload.min, action.payload.max],
      };

    case "RESET_FILTERS":
      return {
        ...state,
        similarityThreshold: 0.1,
        fdrThreshold: 1.0,
        pValueThreshold: 1.0,
        searchQuery: "",
        nesRange: [state.nesDataRange.min, state.nesDataRange.max],
      };

    default:
      return state;
  }
}

/**
 * Context for enrichment map controls
 */
export const EnrichmentMapControlsContext = createContext<{
  state: EnrichmentMapControlsState;
  dispatch: (action: EnrichmentMapControlsAction) => void;
} | null>(null);

/**
 * Initial state for enrichment map controls
 */
export const createInitialState = (): EnrichmentMapControlsState => ({
  similarityThreshold: 0.1,
  sizeBy: "pathwaySize",
  fdrThreshold: 1.0,
  pValueThreshold: 1.0,
  searchQuery: "",
  nesRange: [-3, 3],
  nesDataRange: { min: -3, max: 3 },
});

/**
 * Provider component for enrichment map controls
 */
export function EnrichmentMapControlsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    enrichmentMapControlsReducer,
    createInitialState()
  );

  // Memoize context value so it only changes when state actually changes
  // This prevents unnecessary re-renders of subscribed components when parent re-renders
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <EnrichmentMapControlsContext.Provider value={value}>
      {children}
    </EnrichmentMapControlsContext.Provider>
  );
}
