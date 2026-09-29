import React, { useMemo, useState } from "react";
import {
  Box,
  ButtonBase,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import OtTable from "../../OtTable/OtTable";
import { OtTableProps } from "../../OtTable/types/tableTypes";
import { cellText, inferColumnKeys, resolveRows } from "./dataPaths";

// OtTable's props type marks everything required; only a subset is needed here
const Table = OtTable as unknown as React.FC<Partial<OtTableProps>>;

export const MAX_TABLE_ROWS = 1000;
const MAX_CHILDREN = 200;

const monoSx = { fontFamily: '"Roboto Mono", monospace', fontSize: 12 } as const;

export interface TableColumnSpec {
  key: string;
  label: string;
  type?: "string" | "number" | "boolean";
}

/**
 * OtTable over plain row objects, capped at 1,000 rendered rows
 */
export const RowsTable: React.FC<{ rows: Record<string, unknown>[]; columns: TableColumnSpec[] }> = ({
  rows,
  columns,
}) => {
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
  const shown = rows.length > MAX_TABLE_ROWS ? rows.slice(0, MAX_TABLE_ROWS) : rows;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Table showGlobalFilter columns={otColumns} rows={shown} loading={false} dataDownloader={false} />
      {rows.length > MAX_TABLE_ROWS && (
        <Typography sx={{ fontSize: 12, fontStyle: "italic", color: "text.secondary", mt: 0.5 }}>
          Showing {MAX_TABLE_ROWS.toLocaleString()} of {rows.length.toLocaleString()}
        </Typography>
      )}
    </Box>
  );
};

const JsonNode: React.FC<{ name?: string; value: unknown; depth: number }> = ({ name, value, depth }) => {
  const isContainer = typeof value === "object" && value !== null;
  const [open, setOpen] = useState(depth < 2);
  const label =
    name !== undefined ? (
      <Box component="span" sx={{ color: "primary.dark" }}>
        {name}:{" "}
      </Box>
    ) : null;

  if (!isContainer) {
    const color = typeof value === "string" ? "#3a7d44" : typeof value === "number" ? "#b35900" : "grey.600";
    return (
      <Box sx={{ pl: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
        {label}
        <Box component="span" sx={{ color }}>
          {JSON.stringify(value) ?? "undefined"}
        </Box>
      </Box>
    );
  }

  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const [openBracket, closeBracket] = Array.isArray(value) ? ["[", "]"] : ["{", "}"];

  return (
    <Box sx={{ pl: depth === 0 ? 0 : 2 }}>
      <ButtonBase
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        sx={{ ...monoSx, justifyContent: "flex-start", textAlign: "left" }}
      >
        <Box component="span" sx={{ width: 12, color: "grey.500" }}>
          {open ? "▾" : "▸"}
        </Box>
        {label}
        {openBracket}
        {!open && (
          <Box component="span" sx={{ color: "grey.500" }}>
            {` ${entries.length} ${Array.isArray(value) ? "items" : "keys"} `}
          </Box>
        )}
        {!open && closeBracket}
      </ButtonBase>
      {open && (
        <>
          {entries.slice(0, MAX_CHILDREN).map(([key, child]) => (
            <JsonNode key={key} name={key} value={child} depth={depth + 1} />
          ))}
          {entries.length > MAX_CHILDREN && (
            <Box sx={{ pl: 2, color: "grey.500" }}>… {entries.length - MAX_CHILDREN} more</Box>
          )}
          <Box>{closeBracket}</Box>
        </>
      )}
    </Box>
  );
};

/**
 * Collapsible JSON tree, first two levels open
 */
export const JsonTree: React.FC<{ data: unknown }> = ({ data }) => (
  <Box sx={{ ...monoSx, overflow: "auto", maxHeight: 480, color: "text.primary" }}>
    <JsonNode value={data} depth={0} />
  </Box>
);

interface DataResultViewProps {
  data?: unknown;
  // Non-JSON response: shown raw in the JSON pane, Table disabled
  rawText?: string;
  display: "table" | "json";
  rowsPath?: string;
  onDisplayChange: (display: "table" | "json") => void;
  onRowsPathChange: (rowsPath: string) => void;
}

/**
 * `Table | JSON` toggle over a result. The table shows the array at rowsPath
 * (auto-detected breadth-first; pickable from the detected arrays).
 */
export const DataResultView: React.FC<DataResultViewProps> = ({
  data,
  rawText,
  display,
  rowsPath,
  onDisplayChange,
  onRowsPathChange,
}) => {
  const { path, rows, paths } = useMemo(() => resolveRows(data, rowsPath), [data, rowsPath]);
  const columns = useMemo(
    () => (rows ? inferColumnKeys(rows).map((key) => ({ key, label: key })) : []),
    [rows]
  );
  const tableAvailable = rawText === undefined && !!rows;
  const effectiveDisplay = tableAvailable ? display : "json";

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={effectiveDisplay}
          onChange={(_, value: "table" | "json" | null) => value && onDisplayChange(value)}
          aria-label="Result view"
          sx={{ "& .MuiToggleButton-root": { py: 0.25, textTransform: "none", fontSize: 12 } }}
        >
          <ToggleButton value="table" disabled={!tableAvailable}>
            Table
          </ToggleButton>
          <ToggleButton value="json">JSON</ToggleButton>
        </ToggleButtonGroup>
        {effectiveDisplay === "table" && paths.length > 1 && (
          <Select
            size="small"
            value={path ?? ""}
            onChange={(e) => onRowsPathChange(e.target.value)}
            inputProps={{ "aria-label": "Rows path" }}
            sx={{ ...monoSx, height: 28, maxWidth: 360 }}
          >
            {paths.map((p) => (
              <MenuItem key={p} value={p} sx={monoSx}>
                {p || "(root)"}
              </MenuItem>
            ))}
          </Select>
        )}
        {effectiveDisplay === "table" && paths.length === 1 && (
          <Typography sx={{ ...monoSx, color: "grey.600" }}>{path || "(root)"}</Typography>
        )}
      </Box>
      {effectiveDisplay === "table" && rows ? (
        <RowsTable rows={rows} columns={columns} />
      ) : rawText !== undefined ? (
        <Box
          component="pre"
          sx={{
            ...monoSx,
            m: 0,
            maxHeight: 480,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {rawText}
        </Box>
      ) : (
        <JsonTree data={data} />
      )}
    </Box>
  );
};

export default DataResultView;
