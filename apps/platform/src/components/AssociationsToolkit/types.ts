export enum ENTITY {
  TARGET = "target",
  DISEASE = "disease",
  DRUG = "drug",
}

export enum TargetPrioritisationAggregation {
  PRECEDENCE = "precedence",
  TRACTABILITY = "tractability",
  DOABILITY = "doability",
  SAFETY = "safety",
}

export type Column = {
  id: string;
  label: string;
  aggregation: TargetPrioritisationAggregation;
  sectionId: string;
  description: string;
  docsLink: string;
  weight?: number | undefined;
  private?: boolean;
  sectionProps?: any;
};

/***************
 * STATE TYPES *
 ***************/

export type Pagination = { pageIndex: number; pageSize: number };
export type Sorting = { id: string; desc: boolean }[];

export type columnAdvanceControl = {
  id: string;
  weight: number;
  required: boolean;
  propagate: boolean;
  aggregation: string;
};

// Reducer-owned state only (URL-backed fields live in AssociationsQueryContext directly)
export interface QueryState {
  enableIndirect: boolean;
  dataSourceControls: Array<columnAdvanceControl>;
  modifiedSourcesDataControls: boolean;
  includeMeasurements: boolean;
}

/*****************
 * ACTIONS TYPES *
 *****************/

export enum ActionType {
  DATA_SOURCE_CONTROL = "DATA_SOURCE_CONTROL",
  RESET_DATA_SOURCE_CONTROL = "RESET_DATA_SOURCE_CONTROL",
  HANDLE_AGGREGATION_CLICK = "HANDLE_AGGREGATION_CLICK",
  SET_INITIAL_STATE = "SET_INITIAL_STATE",
  SET_INCLUDE_MEASUREMENTS = "SET_INCLUDE_MEASUREMENTS",
  SET_ENABLE_INDIRECT = "SET_ENABLE_INDIRECT",
}

export type Action =
  | { type: ActionType.DATA_SOURCE_CONTROL; payload: columnAdvanceControl }
  | { type: ActionType.RESET_DATA_SOURCE_CONTROL }
  | { type: ActionType.HANDLE_AGGREGATION_CLICK; aggregation: string }
  | { type: ActionType.SET_INITIAL_STATE }
  | { type: ActionType.SET_INCLUDE_MEASUREMENTS; includeMeasurements: boolean }
  | { type: ActionType.SET_ENABLE_INDIRECT; enableIndirect: boolean };
