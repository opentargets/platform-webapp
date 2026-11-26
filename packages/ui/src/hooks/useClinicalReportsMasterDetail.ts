import { useApolloClient } from "@apollo/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CLINICAL_RECORDS_QUERY from "../components/ClinicalReports/ClinicalRecordsQuery.gql";

type GetClinicalReportsIds<Row> = (row: Row) => string[] | undefined | null;
type GetMaxClinicalStage<Row> = (row: Row) => string | null | undefined;
type GetRowId<Row> = (row: Row) => string | number | null | undefined;
type GetSelectedEntity<Row> = (
  row: Row
) => { entityType: string; id: string; name: string } | null | undefined;

type UseClinicalReportsMasterDetailOptions<Row> = {
  getClinicalReportsIds: GetClinicalReportsIds<Row>;
  getMaxClinicalStage: GetMaxClinicalStage<Row>;
  getRowId?: GetRowId<Row>;
  getSelectedEntity?: GetSelectedEntity<Row>;
};

type UseClinicalReportsMasterDetailResult<Row> = {
  selectedRow: Row | null;
  selectRow: (row: Row | null) => void;
  selectedEntity: { entityType: string; id: string; name: string } | null;
  recordsByStage: Record<string, any[]> | null;
  maxClinicalStage: string | null;
  loadingRecords: boolean;
  /** warms the cache with a row's clinical reports, so selecting it is instant */
  prefetchRecords: (row: Row | null | undefined) => void;
  /** hover handlers for a row's card: prefetch its reports after a short dwell */
  getPrefetchHandlers: (row: Row) => { onMouseEnter: () => void; onMouseLeave: () => void };
};

type LoadedRecords<Row> = { row: Row; recordsByStage: Record<string, any[]> };

const HOVER_PREFETCH_DELAY = 150;

function groupByClinicalStage(rows: any[]): Record<string, any[]> {
  return rows.reduce(
    (acc, row) => {
      const key = row?.clinicalStage;
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    },
    {} as Record<string, any[]>
  );
}

function useClinicalReportsMasterDetail<Row = any>({
  getClinicalReportsIds,
  getMaxClinicalStage,
  getRowId,
  getSelectedEntity,
}: UseClinicalReportsMasterDetailOptions<Row>): UseClinicalReportsMasterDetailResult<Row> {
  const client = useApolloClient();

  const [selectedRow, setSelectedRow] = useState<Row | null>(null);
  // The reports on display, with the row they belong to. They stay on display
  // while the reports of a newly selected row load, so the detail panel never
  // empties between two selections.
  const [loaded, setLoaded] = useState<LoadedRecords<Row> | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const resolveRowId = useMemo(() => {
    return getRowId ?? ((row: Row) => (row as any)?.id);
  }, [getRowId]);

  const selectRow = (row: Row | null) => {
    const prevId = selectedRow ? resolveRowId(selectedRow) : null;
    const nextId = row ? resolveRowId(row) : null;

    if (prevId != null && nextId != null && prevId === nextId) return;

    setSelectedRow(row);
    setLoadingRecords(!!row);
    if (!row) setLoaded(null);
  };

  // stage and entity describe the reports on display, not the row still loading
  const displayedRow = loaded?.row ?? selectedRow;

  const maxClinicalStage = useMemo(() => {
    if (!displayedRow) return null;
    return getMaxClinicalStage(displayedRow) ?? null;
  }, [displayedRow, getMaxClinicalStage]);

  const selectedEntity = useMemo(() => {
    if (!displayedRow) return null;
    return getSelectedEntity?.(displayedRow) ?? null;
  }, [displayedRow, getSelectedEntity]);

  useEffect(() => {
    if (!selectedRow) return;

    const clinicalReportsIds = getClinicalReportsIds(selectedRow) ?? [];
    if (clinicalReportsIds.length === 0) {
      setLoaded({ row: selectedRow, recordsByStage: {} });
      setLoadingRecords(false);
      return;
    }

    let cancelled = false;

    const fetchRecords = async () => {
      try {
        const result = await client.query({
          query: CLINICAL_RECORDS_QUERY as any,
          variables: { clinicalReportsIds },
        });

        if (cancelled) return;

        const recordsData = result.data?.clinicalReports ?? [];
        setLoaded({ row: selectedRow, recordsByStage: groupByClinicalStage(recordsData) });
      } catch {
        // do not leave another row's reports on display
        if (!cancelled) setLoaded(null);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    };

    fetchRecords();

    return () => {
      cancelled = true;
    };
  }, [client, selectedRow, getClinicalReportsIds]);

  const prefetchRecords = useCallback(
    (row: Row | null | undefined) => {
      if (!row) return;
      const clinicalReportsIds = getClinicalReportsIds(row) ?? [];
      if (clinicalReportsIds.length === 0) return;
      client
        .query({ query: CLINICAL_RECORDS_QUERY as any, variables: { clinicalReportsIds } })
        .catch(() => {
          // a failed prefetch is retried, and reported, when the row is selected
        });
    },
    [client, getClinicalReportsIds]
  );

  const getPrefetchHandlers = useCallback(
    (row: Row) => ({
      onMouseEnter: () => {
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => prefetchRecords(row), HOVER_PREFETCH_DELAY);
      },
      onMouseLeave: () => window.clearTimeout(hoverTimer.current),
    }),
    [prefetchRecords]
  );

  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  return {
    selectedRow,
    selectRow,
    selectedEntity,
    recordsByStage: loaded?.recordsByStage ?? null,
    maxClinicalStage,
    loadingRecords,
    prefetchRecords,
    getPrefetchHandlers,
  };
}

export default useClinicalReportsMasterDetail;
