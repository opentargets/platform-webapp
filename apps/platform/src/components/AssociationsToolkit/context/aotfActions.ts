import { Action, ActionType } from "../types";

export function setDataSourceControl(
  id: string,
  weight: number,
  required: boolean,
  aggregation: string
): Action {
  const sharedWeightConfig = { id, weight, required, aggregation };
  if (id === "expression_atlas") {
    return {
      type: ActionType.DATA_SOURCE_CONTROL,
      payload: { ...sharedWeightConfig, propagate: false },
    };
  }
  return {
    type: ActionType.DATA_SOURCE_CONTROL,
    payload: { ...sharedWeightConfig, propagate: true },
  };
}

export function resetDataSourceControl(): Action {
  return {
    type: ActionType.RESET_DATA_SOURCE_CONTROL,
  };
}

export function aggregationClick(aggregation: string): Action {
  return {
    type: ActionType.HANDLE_AGGREGATION_CLICK,
    aggregation,
  };
}

export function resetToInitialState(): Action {
  return {
    type: ActionType.SET_INITIAL_STATE,
  };
}

export function setIncludeMeasurements(includeMeasurements: boolean): Action {
  return {
    type: ActionType.SET_INCLUDE_MEASUREMENTS,
    includeMeasurements,
  };
}

export function setEnableIndirect(enableIndirect: boolean): Action {
  return {
    type: ActionType.SET_ENABLE_INDIRECT,
    enableIndirect,
  };
}
