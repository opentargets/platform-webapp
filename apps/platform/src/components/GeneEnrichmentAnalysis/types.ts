import type { GseaResult, InputOverlap } from "./api/gseaApi";

/*****************
 * ACTIONS TYPES *
 *****************/
export enum ActionType {
  SET_MODAL_OPEN = "SET_MODAL_OPEN",
  RESET_STATE = "RESET_STATE",
  SET_ASSOCIATIONS_STATE = "SET_ASSOCIATIONS_STATE",
  FETCH_LIBRARIES_REQUEST = "FETCH_LIBRARIES_REQUEST",
  FETCH_LIBRARIES_SUCCESS = "FETCH_LIBRARIES_SUCCESS",
  FETCH_LIBRARIES_FAILURE = "FETCH_LIBRARIES_FAILURE",
  SET_ANALYSIS_INPUTS = "SET_ANALYSIS_INPUTS",
  ADD_RUN = "ADD_RUN",
  UPDATE_RUN = "UPDATE_RUN",
  SET_ACTIVE_RUN = "SET_ACTIVE_RUN",
  DELETE_RUN = "DELETE_RUN",
  SET_STANDALONE_GENES = "SET_STANDALONE_GENES",
}

/***************
 * STATE TYPES *
 ***************/
export interface AssociationsState {
  efoId: string;
  efoName: string;
  filter: string;
  sortBy: string;
  enableIndirect: boolean;
  datasources: Array<{ id: string; weight: number; propagate: boolean; required: boolean }>;
  rowsFilter: string[];
  facetFilters: string[];
  entitySearch: string;
  pinnedEntities: string[];
  uploadedEntities: string[];
}

export type GeneSetSource = "all" | "uploaded" | "pinned";

export type AnalysisDirection = "one_sided_positive" | "one_sided_negative" | "two_sided";

export interface AnalysisInputs {
  selectedLibrary: string;
  geneSetSource: GeneSetSource;
  analysisDirection: AnalysisDirection;
}

/**
 * Gene data structure for GSEA API.
 */
export interface Gene {
  symbol: string;
  globalScore: number;
}

/**
 * Status of an analysis run.
 */
export type RunStatus = "pending" | "fetching_associations" | "running_gsea" | "complete" | "error";

/**
 * Represents a single analysis run with its inputs, status, and results.
 */
export interface AnalysisRun {
  id: string;
  timestamp: number;
  status: RunStatus;
  inputs: AnalysisInputs;
  efoId: string;
  efoName: string;
  genes: Gene[];
  results: GseaResult[];
  inputOverlap: InputOverlap | null;
  error: string | null;
}

export interface State {
  modalOpen: boolean;
  loading: boolean;
  associationsState: AssociationsState;
  libraries: string[];
  librariesLoading: boolean;
  librariesError: string | null;
  analysisInputs: AnalysisInputs;
  runs: AnalysisRun[];
  activeRunId: string | null;
  // null = AOTF modal mode (genes come from GQL)
  // Gene[] = standalone mode (genes provided directly by user or via AOTF handoff)
  standaloneGenes: Gene[] | null;
}

/*****************
 * ACTION TYPES *
 *****************/
export type Action =
  | { type: ActionType.FETCH_LIBRARIES_REQUEST }
  | { type: ActionType.FETCH_LIBRARIES_SUCCESS; payload: string[] }
  | { type: ActionType.FETCH_LIBRARIES_FAILURE; error: string }
  | { type: ActionType.SET_MODAL_OPEN; modalOpen: boolean }
  | { type: ActionType.RESET_STATE }
  | { type: ActionType.SET_ASSOCIATIONS_STATE; associationsState: AssociationsState }
  | { type: ActionType.SET_ANALYSIS_INPUTS; payload: Partial<AnalysisInputs> }
  | { type: ActionType.ADD_RUN; payload: AnalysisRun }
  | { type: ActionType.UPDATE_RUN; payload: { id: string } & Partial<Omit<AnalysisRun, "id">> }
  | { type: ActionType.SET_ACTIVE_RUN; payload: string | null }
  | { type: ActionType.DELETE_RUN; payload: string }
  | { type: ActionType.SET_STANDALONE_GENES; payload: Gene[] | null };
