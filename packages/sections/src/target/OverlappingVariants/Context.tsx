// !! IMPORT SEARCH LIBRARTY HERE UNTIL DECIDE IF USING IT !!
// import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.mjs";

import { escapeRegExp } from "lodash";
import { useMemo } from "react";
import { createContext, useContext, useReducer, ReactNode } from "react";
import { reducer, getInitialState, actions } from "./Reducer";
// import { useQuery } from "@apollo/client";

// !! NEED TO CREATE STATE AND DISPATCH TYPES ??

interface StateContextType {
  state: State;
}

interface DispatchContextType {
  dispatch: Dispatch<Action>;
}

interface ProviderProps {
  children: ReactNode;
  data: [];
}

const StateContext = createContext<StateContextType | undefined>(undefined);
const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

function getFilteredRows(data, state) {
  const rows = [];
  const { startPosition, variant: variantText, consequence, evidence } = state.filters;
  const variantTextRegexp = new RegExp(escapeRegExp(variantText), "i");
  const consequenceIds = new Set(consequence.map(c => c.id));
  const evidenceIds = new Set(evidence.map(e => e.datasourceId));
  for (const row of data.proteinCodingCoordinates.rows) {
    if (row.datasources.length === 0) {
      continue;
    }
    if (row.aminoAcidPosition < startPosition.min || row.aminoAcidPosition > startPosition.max)
      continue;
    if (
      variantText &&
      !variantTextRegexp.test(
        `${row.variant.chromosome}_${row.variant.position}_${row.variant.referenceAllele}_${row.variant.alternateAllele}`
      )
    ) {
      continue;
    }
    if (consequenceIds.size > 0) {
      let hit = false;
      for (const { id } of row.variantConsequences) {
        if (consequenceIds.has(id)) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
    }
    if (evidenceIds.size > 0) {
      let hit = false;
      for (const { datasourceId } of row.datasources) {
        if (evidenceIds.has(datasourceId)) {
          hit = true;
          break;
        }
      }
      if (!hit) continue;
    }
    rows.push(row);
  }
  return rows;
}

export function StateProvider({ children, data, query, variables }: ProviderProps) {
  const initialState = getInitialState({ data, query, variables });
  const [state, dispatch] = useReducer(reducer, initialState);

  const filteredRows = useMemo(() => {
    return getFilteredRows(data, state);
  }, [state.filters]);

  return (
    <StateContext.Provider value={{ state, filteredRows }}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// custom hooks to use the contexts
export function useStateValue() {
  const context = useContext(StateContext);
  if (context === undefined) {
    throw new Error("useStateValue must be used within a StateProvider");
  }
  return context;
}

export function useDispatch() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error("useDispatch must be used within a StateProvider");
  }
  return context;
}

export function useActions() {
  const context = useContext(DispatchContext);
  if (context === undefined) {
    throw new Error("useActions must be used within a StateProvider");
  }
  const wrappedActions = {};
  for (const [name, actionFn] of Object.entries(actions)) {
    wrappedActions[name] = newValue => context(actionFn(newValue));
  }
  return wrappedActions;
}
