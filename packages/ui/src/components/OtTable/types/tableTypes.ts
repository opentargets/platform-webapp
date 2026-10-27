import type { ApolloClient, DocumentNode, NormalizedCacheObject } from "@apollo/client";
import type {
  ColumnDef,
  RowData,
  SortingState,
  Table,
  Row as TableRow,
} from "@tanstack/table-core";
import type { ReactNode } from "react";

// presentation keys of an OtTable column that are spread onto the react-table
// column definition (see mapTableColumnToTanstackColumns)
declare module "@tanstack/table-core" {
  // biome-ignore lint/correctness/noUnusedVariables: the type parameters must match the augmented interface
  interface ColumnDefBase<TData extends RowData, TValue = unknown> {
    label?: string;
    tooltip?: ReactNode;
    numeric?: boolean;
    sticky?: boolean;
    verticalHeader?: boolean;
  }
}

/** A column of an OtTable, as written by the sections */
export type OtTableColumn<Row> = {
  id: string;
  /** header content; a plain string is also used as the export header unless `exportLabel` is set */
  label: ReactNode;
  renderCell?: (row: Row) => ReactNode;
  /** value used for searching/sorting; defaults to the value at `id` (dot path) */
  filterValue?: (row: Row) => unknown;
  exportValue?: (row: Row) => unknown;
  exportLabel?: string;
  sortable?: boolean;
  comparator?: (a: Row, b: Row) => number;
  enableHiding?: boolean;
  enableColumnFilter?: boolean;
  tooltip?: ReactNode;
  numeric?: boolean;
  sticky?: boolean;
  verticalHeader?: boolean;
  width?: string;
};

export const INIT_PAGE_SIZE = 10;

/******************************
 * OT TABLE CLIENT SIDE TYPES *
 ******************************/

export type DefaultSortProp =
  | [
      {
        id: string;
        desc: boolean;
      },
    ]
  | undefined;

export type OtTableProps = {
  showGlobalFilter: boolean;
  globalFilterPlaceholderText?: string;
  tableDataLoading: boolean;
  columns: Array<Record<string, unknown>>;
  rows: Array<Record<string, unknown>>;
  verticalHeaders: boolean;
  order: "asc" | "desc";
  sortBy: string;
  defaultSortObj: DefaultSortProp;
  dataDownloader: boolean;
  dataDownloaderColumns?: Array<Record<string, unknown>>;
  dataDownloaderRows?: Array<Record<string, unknown>>;
  dataDownloaderFileStem: string;
  query: DocumentNode;
  variables: Record<string, unknown>;
  showColumnVisibilityControl: boolean;
  showRowsPerPageControl: boolean;
  showPaginationAlways: boolean;
  loading: boolean;
  enableMultipleRowSelection: boolean;
  getSelectedRows: (r: TableRow<any>[]) => void;
  getFilteredRows: any;
  wrapControls: any;
};

export type loadingTableRows = {
  id: Record<string, unknown>;
};

/*************************
 * OT TABLE SEARCH TYPES *
 *************************/

export type OtTableSearchProps = {
  setGlobalSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  placeholderText?: string;
};

export type OtTableColumnVisibilityProps = {
  table: Table<any>;
};

/******************************
 * OT TABLE SERVER SIDE TYPES *
 ******************************/

export type OtTableSSPProps = {
  showGlobalFilter: boolean;
  entity: string;
  sectionName: string;
  verticalHeaders: boolean;
  columns: Array<ColumnDef<string, unknown>>;
  query: DocumentNode;
  variables: Record<string, unknown>;
  dataDownloaderFileStem: string;
  dataDownloader: boolean;
  dataDownloaderColumns?: Array<ColumnDef<string, unknown>>;
  showColumnVisibilityControl: boolean;
  setInitialRequestData: any;
  enableMultipleRowSelection: boolean;
  getSelectedRows: (r: TableRow<any>[]) => void;
};

export type OtTableSSPState = {
  count: number;
  loading: boolean;
  rows: Array<unknown>;
  cursor: null | string;
  freeTextQuery: null | string;
  initialLoading: boolean;
};

export type getTableRowsProps = {
  size: number;
  query: DocumentNode;
  cursor: string | null;
  freeTextQuery: string | null;
  variables: Record<string, unknown>;
  client: ApolloClient<NormalizedCacheObject>;
};

/*****************
 * ACTIONS TYPES *
 *****************/

export enum ActionType {
  PAGE_SIZE_CHANGE = "PAGE_SIZE_CHANGE",
  PAGE_CHANGE = "PAGE_CHANGE",
  TEXT_SEARCH = "TEXT_SEARCH",
  SET_LOADING = "SET_LOADING",
  SET_DATA = "SET_DATA",
  ADD_DATA = "ADD_DATA",
}

export type Action =
  | { type: ActionType.PAGE_SIZE_CHANGE; pageSize: number }
  | { type: ActionType.PAGE_CHANGE; payload: Record<string, unknown> }
  | { type: ActionType.TEXT_SEARCH; freeQueryText: string }
  | { type: ActionType.SET_DATA; payload: Record<string, unknown> }
  | { type: ActionType.ADD_DATA; payload: Record<string, unknown> }
  | { type: ActionType.SET_LOADING; loading: boolean };

/*************************************
 * OT TABLE SERVER PAGINATION TYPES  *
 *************************************/

/**
 * @typeParam Row the rows rendered by the table
 * @typeParam ServerRow the rows returned by the API when `transformRows` reshapes them
 */
export type OtTableServerProps<Row extends object, ServerRow extends object = Row> = {
  columns: OtTableColumn<Row>[];
  query: DocumentNode;
  /** base query variables; `index`, `size`, sort and search variables are added by the table */
  variables: Record<string, unknown>;
  /** path of the `{ count, rows }` object in the response, e.g. `disease.phenotypes` */
  dataPath: string;
  rowField?: string;
  countField?: string;
  /** reshapes the rows of a page (and of the downloaded dataset) */
  transformRows?: (rows: ServerRow[]) => Row[];
  pageSize?: number;
  pageSizeOptions?: number[];
  sortBy?: string;
  order?: "asc" | "desc";
  /** maps the react-table sorting state to query variables; enables server-side sorting */
  getSortVariables?: (sorting: SortingState) => Record<string, unknown>;
  /** name of the query variable receiving the global search text (server-side search);
   * without it a search term fetches the whole dataset once and filters it locally */
  searchVariable?: string;
  showGlobalFilter?: boolean;
  globalFilterPlaceholderText?: string;
  verticalHeaders?: boolean;
  showColumnVisibilityControl?: boolean;
  showRowsPerPageControl?: boolean;
  showPaginationAlways?: boolean;
  dataDownloader?: boolean;
  dataDownloaderColumns?: OtTableColumn<Row>[];
  dataDownloaderFileStem?: string;
  enableMultipleRowSelection?: boolean;
  getSelectedRows?: (rows: TableRow<Row>[]) => void;
  /** receives the raw response of every page request */
  onDataLoaded?: (data: unknown) => void;
  wrapControls?: boolean | Record<string, unknown>;
};
