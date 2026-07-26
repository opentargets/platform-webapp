import { type Action, ActionType } from "../types/tableTypes";

export function onPageSizeChange(pageSize: number): Action {
  return {
    type: ActionType.PAGE_SIZE_CHANGE,
    pageSize,
  };
}

export function onPageChange(payload: Record<string, unknown>): Action {
  return {
    type: ActionType.PAGE_CHANGE,
    payload,
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

export function addRows(payload: Record<string, unknown>): Action {
  return {
    type: ActionType.ADD_DATA,
    payload,
  };
}

export function setNewData(payload: Record<string, unknown>): Action {
  return {
    type: ActionType.SET_DATA,
    payload,
  };
}
