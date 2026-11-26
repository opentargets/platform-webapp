import type { DocumentNode } from "@apollo/client";
import type { PaginationState } from "@tanstack/react-table";
import _ from "lodash";
import { useEffect, useRef, useState } from "react";
import { useApolloClient } from "../../../../providers/OTApolloProvider/OTApolloProvider";
import type { ServerPage, ServerPageState } from "../types";

type UseServerPageOptions<Row, ServerRow> = {
  query: DocumentNode;
  requestVariables: Record<string, unknown>;
  pagination: PaginationState;
  dataPath: string;
  rowField: string;
  countField: string;
  toRows: (rows: ServerRow[]) => Row[];
  /** a local search or sort is active */
  localMode: boolean;
  /** the pages are being cut from the downloaded dataset, so none is requested */
  skip: boolean;
  /** receives the raw response of every page request */
  onDataLoaded?: (data: unknown) => void;
  /** called once the rows of a requested page are in place */
  onPageLoaded?: () => void;
  /** fetches the pages either side of the current one in the background */
  prefetchAdjacentPages: boolean;
  /** receives the rows of each page fetched in the background */
  onPagePrefetched?: (rows: Row[]) => void;
};

/**
 * Requests the page on display whenever the page, the page size or the request
 * variables change. A request is cancelled on the network once a newer one
 * supersedes it, and the neighbouring pages can be fetched in the background.
 */
function useServerPage<Row, ServerRow>({
  query,
  requestVariables,
  pagination,
  dataPath,
  rowField,
  countField,
  toRows,
  localMode,
  skip,
  onDataLoaded,
  onPageLoaded,
  prefetchAdjacentPages,
  onPagePrefetched,
}: UseServerPageOptions<Row, ServerRow>): ServerPageState<Row> {
  const client = useApolloClient();
  const requestId = useRef(0);
  const [state, setState] = useState<ServerPageState<Row>>({
    rows: [],
    count: 0,
    loading: true,
    initialLoading: true,
    error: null,
  });

  useEffect(() => {
    // pages of a local search or sort are cut from the whole dataset
    if (skip) return;
    const currentRequest = ++requestId.current;
    // cancels the request on the network once a newer one supersedes it (a
    // further keystroke in the search, another page or sort) or the table unmounts
    const controller = new AbortController();
    const readRows = (data: unknown) => {
      const page = _.get(data, dataPath, {}) as ServerPage<ServerRow>;
      return {
        rows: toRows((page[rowField] ?? []) as ServerRow[]),
        count: (page[countField] ?? 0) as number,
      };
    };
    setState((prev) => ({ ...prev, loading: true }));
    client
      .query<Record<string, unknown>>({
        query,
        variables: {
          ...requestVariables,
          index: pagination.pageIndex,
          size: pagination.pageSize,
        },
        fetchPolicy: "cache-first",
        context: { fetchOptions: { signal: controller.signal } },
      })
      .then((response) => {
        if (currentRequest !== requestId.current) return;
        const { rows, count } = readRows(response.data);
        setState({ rows, count, loading: false, initialLoading: false, error: null });
        onDataLoaded?.(response.data);
        onPageLoaded?.();
        if (!prefetchAdjacentPages || localMode) return;
        const lastPageIndex = Math.ceil(count / pagination.pageSize) - 1;
        for (const index of [pagination.pageIndex + 1, pagination.pageIndex - 1]) {
          if (index < 0 || index > lastPageIndex) continue;
          client
            .query<Record<string, unknown>>({
              query,
              variables: { ...requestVariables, index, size: pagination.pageSize },
              fetchPolicy: "cache-first",
            })
            .then((adjacent) => onPagePrefetched?.(readRows(adjacent.data).rows))
            .catch(() => {
              // a failed prefetch is retried, and reported, when the page is opened
            });
        }
      })
      .catch((error: Error) => {
        if (currentRequest !== requestId.current) return;
        if (controller.signal.aborted) {
          // cancelled without a newer page request (the rows now come from the
          // downloaded dataset): not an error, the table is just no longer loading
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }
        setState({ rows: [], count: 0, loading: false, initialLoading: false, error });
      });
    return () => controller.abort();
  }, [
    client,
    query,
    requestVariables,
    pagination.pageIndex,
    pagination.pageSize,
    dataPath,
    localMode,
    skip,
  ]);

  return state;
}

export default useServerPage;
