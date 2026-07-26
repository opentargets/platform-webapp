import { useApolloClient } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
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
};

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
  const [recordsByStage, setRecordsByStage] = useState<Record<string, any[]> | null>(null);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const resolveRowId = useMemo(() => {
    return getRowId ?? ((row: Row) => (row as any)?.id);
  }, [getRowId]);

  const selectRow = (row: Row | null) => {
    const prevId = selectedRow ? resolveRowId(selectedRow) : null;
    const nextId = row ? resolveRowId(row) : null;

    if (prevId != null && nextId != null && prevId === nextId) return;

    setSelectedRow(row);
    setRecordsByStage(null);
    if (row) setLoadingRecords(true);
  };

  const maxClinicalStage = useMemo(() => {
    if (!selectedRow) return null;
    return getMaxClinicalStage(selectedRow) ?? null;
  }, [selectedRow, getMaxClinicalStage]);

  const selectedEntity = useMemo(() => {
    if (!selectedRow) return null;
    return getSelectedEntity?.(selectedRow) ?? null;
  }, [selectedRow, getSelectedEntity]);

  useEffect(() => {
    if (!selectedRow) return;

    const clinicalReportsIds = getClinicalReportsIds(selectedRow) ?? [];
    if (clinicalReportsIds.length === 0) return;

    let cancelled = false;

    const fetchRecords = async () => {
      try {
        const result = await client.query({
          query: CLINICAL_RECORDS_QUERY as any,
          variables: { clinicalReportsIds },
        });

        if (cancelled) return;

        const recordsData = result.data?.clinicalReports ?? [];
        const grouped = groupByClinicalStage(recordsData);
        setRecordsByStage(grouped);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    };

    fetchRecords();

    return () => {
      cancelled = true;
    };
  }, [client, selectedRow, getClinicalReportsIds]);

  return {
    selectedRow,
    selectRow,
    selectedEntity,
    recordsByStage,
    maxClinicalStage,
    loadingRecords,
  };
}

export default useClinicalReportsMasterDetail;
