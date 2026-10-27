import { Action, ActionType, DownloadRow, DownloadsState } from "../types/downloadTypes";
import {
  addCategoriesToData,
  filterDownloadCardsForFilter,
  filterDownloadCardsForTextSearch,
  getAllLocationUrl,
  prepareDataRows,
  getSchemaRows,
} from "../utils";
import { getDatasetId } from "./downloadsSelectors";
import { readStoredBasket } from "./basketStorage";

export const initialState: DownloadsState = {
  count: 0,
  loading: true,
  freeTextQuery: "",
  rows: [],
  filteredRows: [],
  schemaRows: [],
  allUniqueCategories: [],
  selectedFilters: [],
  downloadsData: null,
  locationURLs: {},
  view: "cards",
  basket: [],
  basketOpen: false,
  networkScope: "all",
  selectedNodeId: null,
};

/** Lazy initialiser for useReducer: restores the persisted basket (pruned once the rows arrive). */
export function createInitialState(initialState: DownloadsState): DownloadsState {
  return { ...initialState, basket: readStoredBasket() };
}

/**
 * filteredRows = rows ∩ (selectedCategories ? anyOf : all) ∩ matches(query).
 * Search runs within the selected categories; always derived from `rows` so
 * removing a category widens the result again.
 */
function applyFilters(rows: DownloadRow[], selectedFilters: string[], query: string): DownloadRow[] {
  const byCategory = selectedFilters.length
    ? (filterDownloadCardsForFilter(selectedFilters, rows) as DownloadRow[] | undefined) ?? []
    : rows;
  if (!query) return byCategory;
  return (filterDownloadCardsForTextSearch(query, byCategory) as DownloadRow[] | undefined) ?? [];
}

/** A basket that just emptied can't stay the network's scope. */
function withBasket(state: DownloadsState, basket: string[]): DownloadsState {
  return {
    ...state,
    basket,
    networkScope: basket.length === 0 && state.networkScope === "basket" ? "all" : state.networkScope,
  };
}

export function downloadsReducer(
  state: DownloadsState = initialState,
  action: Action
): DownloadsState {
  if (typeof state === undefined) {
    throw Error("State provided to table reducer is undefined");
  }
  switch (action.type) {
    case ActionType.SET_LOADING: {
      return {
        ...state,
        loading: action.loading,
      };
    }
    case ActionType.TEXT_SEARCH: {
      const filteredRows = applyFilters(state.rows, state.selectedFilters, action.freeQueryText);
      return {
        ...state,
        freeTextQuery: action.freeQueryText,
        filteredRows,
        count: filteredRows.length,
      };
    }
    case ActionType.CLEAR_FILTER_DATA: {
      return {
        ...state,
        filteredRows: state.rows,
        count: state.rows.length,
        selectedFilters: [],
        freeTextQuery: "",
      };
    }
    case ActionType.SET_ACTIVE_FILTER: {
      const filteredRows = applyFilters(state.rows, action.selectedFilters, state.freeTextQuery);
      return {
        ...state,
        selectedFilters: action.selectedFilters,
        filteredRows,
        count: filteredRows.length,
      };
    }
    case ActionType.SET_DOWNLOADS_DATA: {
      const downloadsData = JSON.parse(JSON.stringify(action.downloadsData));
      const parsedData = prepareDataRows(action.downloadsData);
      const { allDisplayRows, allUniqueCategories } = addCategoriesToData(parsedData);
      const rows = allDisplayRows as DownloadRow[];
      const locationURLs: Record<string, string> = getAllLocationUrl(action.downloadsData);
      const schemaRows = getSchemaRows(action.downloadsData);
      // Drop persisted basket ids that no longer exist in this release's rows
      const knownIds = new Set(rows.map(getDatasetId));
      const basket = state.basket.filter(id => knownIds.has(id));
      return withBasket(
        {
          ...state,
          loading: false,
          downloadsData,
          rows,
          filteredRows: rows,
          count: rows.length,
          allUniqueCategories: allUniqueCategories as string[],
          schemaRows,
          locationURLs,
        },
        basket
      );
    }

    case ActionType.SET_ERROR: {
      return {
        ...state,
        loading: false,
        downloadsData: initialState,
      };
    }

    case ActionType.SET_VIEW: {
      if (state.view === action.view) return state;
      return { ...state, view: action.view };
    }
    case ActionType.ADD_TO_BASKET: {
      const missing = action.ids.filter(id => !state.basket.includes(id));
      if (!missing.length) return state;
      return withBasket(state, [...state.basket, ...missing]);
    }
    case ActionType.REMOVE_FROM_BASKET: {
      if (!state.basket.includes(action.id)) return state;
      return withBasket(
        state,
        state.basket.filter(id => id !== action.id)
      );
    }
    case ActionType.CLEAR_BASKET: {
      return withBasket({ ...state, basketOpen: false }, []);
    }
    case ActionType.SET_BASKET_OPEN: {
      return { ...state, basketOpen: action.open };
    }
    case ActionType.SET_NETWORK_SCOPE: {
      if (action.scope === "basket" && state.basket.length === 0) return state;
      return { ...state, networkScope: action.scope };
    }
    case ActionType.SELECT_NODE: {
      return { ...state, selectedNodeId: action.id };
    }

    default: {
      throw Error("Unknown action: " + action);
      return state;
    }
  }
}
