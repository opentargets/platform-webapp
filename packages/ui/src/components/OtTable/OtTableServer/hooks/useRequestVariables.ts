import { SortDirection } from "@ot/constants";
import type { SortingState } from "@tanstack/react-table";
import { useMemo } from "react";
import type { OtTableColumn } from "../../types/tableTypes";

type UseRequestVariablesOptions<Row> = {
  columns: OtTableColumn<Row>[];
  /** base query variables of the table */
  variables: Record<string, unknown>;
  sorting: SortingState;
  search: string;
};

/**
 * Works out, from the columns, what the server can sort and search, and builds
 * the query variables for it. Whatever the server cannot do is flagged as a
 * local fallback, which needs the whole dataset.
 */
function useRequestVariables<Row>({
  columns,
  variables,
  sorting,
  search,
}: UseRequestVariablesOptions<Row>) {
  const memoizedVariables = useMemo(() => ({ ...variables }), [JSON.stringify(variables)]);
  // Keyed by content, not by the `columns` array: sections that build their
  // columns inline pass a new array on every render, and these feed
  // `requestVariables`, whose identity resets the page and the local dataset.
  const sortFieldsKey = JSON.stringify(
    columns.filter((column) => column.sortField).map((column) => [column.id, column.sortField])
  );
  const serverSortFields = useMemo(
    () => new Map<string, string>(JSON.parse(sortFieldsKey) as [string, string][]),
    [sortFieldsKey]
  );
  const searchFieldsKey = JSON.stringify([
    ...new Set(columns.flatMap((column) => column.searchFields ?? [])),
  ]);
  const serverSearchFields = useMemo(
    () => JSON.parse(searchFieldsKey) as string[],
    [searchFieldsKey]
  );
  const serverSorting = serverSortFields.size > 0;
  const serverSearch = serverSearchFields.length > 0;
  const serverSearchTerm = serverSearch ? search.trim() : "";
  const localSearchTerm = serverSearch ? "" : search.trim();
  const localSearchMode = localSearchTerm.length > 0;
  const localSortMode = !serverSorting && sorting.length > 0;

  // variables shared by the page requests and the full-dataset download
  const requestVariables = useMemo(
    () => ({
      ...memoizedVariables,
      ...(serverSorting
        ? {
            sort: sorting.flatMap(({ id, desc }) => {
              const key = serverSortFields.get(id);
              return key
                ? [{ key, direction: desc ? SortDirection.Descending : SortDirection.Ascending }]
                : [];
            }),
          }
        : {}),
      // omitted when empty so the first page shares its cache entry with the section's own query
      ...(serverSearchTerm
        ? {
            search: {
              text: serverSearchTerm,
              fields: serverSearchFields,
            },
          }
        : {}),
    }),
    [
      memoizedVariables,
      serverSorting,
      sorting,
      serverSortFields,
      serverSearchTerm,
      serverSearchFields,
    ]
  );

  return {
    requestVariables,
    serverSortFields,
    serverSorting,
    localSearchTerm,
    localSearchMode,
    localSortMode,
    // either fallback needs the whole dataset
    localMode: localSearchMode || localSortMode,
  };
}

export default useRequestVariables;
