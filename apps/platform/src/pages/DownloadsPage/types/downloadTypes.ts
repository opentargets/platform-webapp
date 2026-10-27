/** One dataset as shown on the Downloads page: a Croissant FileSet merged with its RecordSet's description. */
export interface DownloadRow {
  "@id": string;
  "@type"?: string;
  name: string;
  description: string;
  /** Category tags parsed out of the description's trailing "[A, B]" marker */
  categories: string[];
  /** The FileObject location(s) this dataset is published under (ftp/gcp/aws) */
  containedIn?: { "@id": string } | Array<{ "@id": string }>;
  [key: string]: unknown;
}

export type DownloadsView = "cards" | "network";
export type NetworkScope = "all" | "basket";

export type DownloadsState = {
  count: number;
  loading: boolean;
  freeTextQuery: string;
  rows: DownloadRow[];
  filteredRows: DownloadRow[];
  schemaRows: Array<Record<string, unknown>>;
  allUniqueCategories: Array<string>;
  selectedFilters: Array<string>;
  downloadsData: Record<string, unknown> | null;
  locationURLs: Record<string, string>;
  view: DownloadsView;
  /** Dataset ids (RecordSet ids, i.e. the FileSet id without "-fileset") in insertion order */
  basket: string[];
  basketOpen: boolean;
  networkScope: NetworkScope;
  selectedNodeId: string | null;
};

/*****************
 * ACTIONS TYPES *
 *****************/

export enum ActionType {
  TEXT_SEARCH = "TEXT_SEARCH",
  SET_LOADING = "SET_LOADING",
  CLEAR_FILTER_DATA = "CLEAR_FILTER_DATA",
  SET_ACTIVE_FILTER = "SET_ACTIVE_FILTER",
  SET_DOWNLOADS_DATA = "SET_DOWNLOADS_DATA",
  SET_ERROR = "SET_ERROR",
  SET_VIEW = "SET_VIEW",
  ADD_TO_BASKET = "ADD_TO_BASKET",
  REMOVE_FROM_BASKET = "REMOVE_FROM_BASKET",
  CLEAR_BASKET = "CLEAR_BASKET",
  SET_BASKET_OPEN = "SET_BASKET_OPEN",
  SET_NETWORK_SCOPE = "SET_NETWORK_SCOPE",
  SELECT_NODE = "SELECT_NODE",
}

export type Action =
  | { type: ActionType.SET_DOWNLOADS_DATA; downloadsData: Record<string, unknown> }
  | { type: ActionType.CLEAR_FILTER_DATA }
  | { type: ActionType.SET_ACTIVE_FILTER; selectedFilters: Array<string> }
  | { type: ActionType.TEXT_SEARCH; freeQueryText: string }
  | { type: ActionType.SET_LOADING; loading: boolean }
  | { type: ActionType.SET_ERROR; error: string }
  | { type: ActionType.SET_VIEW; view: DownloadsView }
  | { type: ActionType.ADD_TO_BASKET; ids: string[] }
  | { type: ActionType.REMOVE_FROM_BASKET; id: string }
  | { type: ActionType.CLEAR_BASKET }
  | { type: ActionType.SET_BASKET_OPEN; open: boolean }
  | { type: ActionType.SET_NETWORK_SCOPE; scope: NetworkScope }
  | { type: ActionType.SELECT_NODE; id: string | null };
