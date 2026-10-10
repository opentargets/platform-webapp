import React, { useMemo } from "react";
import type { ReportComponents } from "report-builder";
import OtTable from "./OtTable";
import { OtTableProps } from "./types/tableTypes";

// OtTable's props type marks everything required; only a subset is needed here
const Table = OtTable as unknown as React.FC<Partial<OtTableProps>>;

type Props = React.ComponentProps<NonNullable<ReportComponents["RowsTable"]>>;

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/** OtTable over plain row objects: the report builder's table for data-block and notebook results. */
export const ReportRowsTable: React.FC<Props> = ({ rows, columns }) => {
  const otColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.key,
        label: column.label,
        sortable: true,
        // Read by key directly: OtTable would treat dots in ids as nested paths
        filterValue: (row: Record<string, unknown>) => {
          const value = row[column.key];
          return typeof value === "object" && value !== null ? JSON.stringify(value) : value;
        },
        renderCell: (row: Record<string, unknown>) => cellText(row[column.key]),
      })),
    [columns]
  );
  return <Table showGlobalFilter columns={otColumns} rows={rows} loading={false} dataDownloader={false} />;
};

export default ReportRowsTable;
