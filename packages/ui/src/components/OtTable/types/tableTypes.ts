import type { ApolloClient, DocumentNode, NormalizedCacheObject } from "@apollo/client";
import type { ColumnDef, Row, Table } from "@tanstack/table-core";

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
  getSelectedRows: (r: Row<any>[]) => void;
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
  getSelectedRows: (r: Row<any>[]) => void;
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
