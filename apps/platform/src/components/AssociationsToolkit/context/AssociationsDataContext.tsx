import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useApolloClient } from "ui";
import { METRICS_SORT_FIELD } from "../static_datasets/rowMetrics";
import useAssociationsData from "../hooks/useAssociationsData";
import { useAotfQueryState } from "./AssociationsQueryContext";
import { useAotfURLState } from "./AssociationsURLContext";

export interface DataContextState {
  data: any[];
  loading: boolean;
  initialLoading: boolean;
  error: any;
  count: number;
  pinnedData: any[];
  pinnedLoading: boolean;
  pinnedError: any;
  pinnedCount: number;
  uploadedData: any[];
  uploadedLoading: boolean;
  uploadedError: any;
  uploadedCount: number;
}

const AssociationsDataContext = createContext<DataContextState | null>(null);

export function AssociationsDataProvider({ children }: { children: ReactNode }) {
  const {
    id,
    entity,
    query,
    pagination,
    sorting,
    enableIndirect,
    dataSourceControls,
    facetFiltersIds,
    entitySearch,
    includeMeasurements,
  } = useAotfQueryState();

  const { pinnedEntries, uploadedEntries } = useAotfURLState();
  const client = useApolloClient();

  const resolvedSortBy = METRICS_SORT_FIELD[sorting[0].id] ?? sorting[0].id;

  const sharedOptions = {
    id,
    entity,
    enableIndirect,
    sortBy: resolvedSortBy,
    datasources: dataSourceControls,
    facetFilters: facetFiltersIds,
    entitySearch,
    includeMeasurements,
  };

  const { data, initialLoading, loading, error, count } = useAssociationsData({
    client,
    query,
    options: {
      ...sharedOptions,
      index: pagination.pageIndex,
      size: pagination.pageSize,
    },
  });

  const {
    data: pinnedData,
    loading: pinnedLoading,
    error: pinnedError,
    count: pinnedCount,
  } = useAssociationsData({
    client,
    query,
    options: {
      ...sharedOptions,
      size: pinnedEntries.length,
      rowsFilter: pinnedEntries.toSorted(),
      laodingCount: pinnedEntries.length,
    },
  });

  const {
    data: uploadedData,
    loading: uploadedLoading,
    error: uploadedError,
    count: uploadedCount,
  } = useAssociationsData({
    client,
    query,
    options: {
      ...sharedOptions,
      size: uploadedEntries.length,
      rowsFilter: uploadedEntries.toSorted(),
      laodingCount: uploadedEntries.length,
    },
  });

  const value = useMemo<DataContextState>(
    () => ({
      data,
      loading,
      initialLoading,
      error,
      count,
      pinnedData,
      pinnedLoading,
      pinnedError,
      pinnedCount,
      uploadedData,
      uploadedLoading,
      uploadedError,
      uploadedCount,
    }),
    [
      data, loading, initialLoading, error, count,
      pinnedData, pinnedLoading, pinnedError, pinnedCount,
      uploadedData, uploadedLoading, uploadedError, uploadedCount,
    ]
  );

  return (
    <AssociationsDataContext.Provider value={value}>{children}</AssociationsDataContext.Provider>
  );
}

export function useAotfData(): DataContextState {
  const ctx = useContext(AssociationsDataContext);
  if (!ctx) throw new Error("useAotfData must be used within AssociationsDataProvider");
  return ctx;
}
