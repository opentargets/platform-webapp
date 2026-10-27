import { Action, ActionType, DownloadsView, NetworkScope } from "../types/downloadTypes";

export function setDownloadsData(downloadsData: Record<string, unknown>): Action {
  return {
    type: ActionType.SET_DOWNLOADS_DATA,
    downloadsData,
  };
}

export function clearFilterData(): Action {
  return {
    type: ActionType.CLEAR_FILTER_DATA,
  };
}

export function setActiveFilter(selectedFilters: Array<string>): Action {
  return {
    type: ActionType.SET_ACTIVE_FILTER,
    selectedFilters,
  };
}

export function textSearch(freeQueryText: string): Action {
  return {
    type: ActionType.TEXT_SEARCH,
    freeQueryText,
  };
}

export function setLoading(loading: boolean): Action {
  return {
    type: ActionType.SET_LOADING,
    loading,
  };
}

export function setError(error: string): Action {
  return {
    type: ActionType.SET_ERROR,
    error,
  };
}

export function setView(view: DownloadsView): Action {
  return { type: ActionType.SET_VIEW, view };
}

export function addToBasket(ids: string[]): Action {
  return { type: ActionType.ADD_TO_BASKET, ids };
}

export function removeFromBasket(id: string): Action {
  return { type: ActionType.REMOVE_FROM_BASKET, id };
}

export function clearBasket(): Action {
  return { type: ActionType.CLEAR_BASKET };
}

export function setBasketOpen(open: boolean): Action {
  return { type: ActionType.SET_BASKET_OPEN, open };
}

export function setNetworkScope(scope: NetworkScope): Action {
  return { type: ActionType.SET_NETWORK_SCOPE, scope };
}

export function selectNode(id: string | null): Action {
  return { type: ActionType.SELECT_NODE, id };
}
