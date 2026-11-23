import type { DocumentNode } from "@apollo/client";
import { useEffect, useRef, useState } from "react";
import useBatchDownloader from "../../../../hooks/useBatchDownloader";

type UseWholeDatasetOptions<Row, ServerRow> = {
  query: DocumentNode;
  /** the dataset is only valid for these variables */
  requestVariables: Record<string, unknown>;
  dataPath: string;
  rowField: string;
  countField: string;
  toRows: (rows: ServerRow[]) => Row[];
  /** a local search or sort is active, so the whole dataset is needed */
  localMode: boolean;
};

/**
 * The whole dataset, for the local search and sort fallbacks and for the data
 * downloader. It is downloaded the first time a local search term is typed or a
 * column is sorted, and dropped when the request variables change.
 */
function useWholeDataset<Row, ServerRow>({
  query,
  requestVariables,
  dataPath,
  rowField,
  countField,
  toRows,
  localMode,
}: UseWholeDatasetOptions<Row, ServerRow>) {
  const requestId = useRef(0);
  const [allRows, setAllRows] = useState<Row[] | null>(null);
  const [allRowsLoading, setAllRowsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // the downloader reads from the Apollo result, hence the `data.` prefix
  const getWholeDataset: () => Promise<ServerRow[]> = useBatchDownloader(
    query,
    requestVariables,
    `data.${dataPath}`,
    rowField,
    countField
  );
  const downloadRows = async (): Promise<Row[]> => toRows(await getWholeDataset());

  useEffect(() => {
    // also drops a download still in flight for the previous variables
    requestId.current += 1;
    setAllRows(null);
    setAllRowsLoading(false);
    setError(null);
  }, [requestVariables]);

  useEffect(() => {
    if (!localMode || allRows !== null || allRowsLoading) return;
    // Not cancelled on cleanup: the rows stay valid for these variables even if
    // the search is cleared meanwhile, and the loading flag must always be reset.
    const currentRequest = ++requestId.current;
    const isCurrent = () => currentRequest === requestId.current;
    setAllRowsLoading(true);
    downloadRows()
      .then((rows) => {
        if (isCurrent()) setAllRows(rows);
      })
      .catch((downloadError: Error) => {
        if (!isCurrent()) return;
        setError(downloadError);
        setAllRows([]);
      })
      .finally(() => isCurrent() && setAllRowsLoading(false));
  }, [localMode, allRows, allRowsLoading, requestVariables]);

  return { allRows, allRowsLoading, downloadRows, error };
}

export default useWholeDataset;
