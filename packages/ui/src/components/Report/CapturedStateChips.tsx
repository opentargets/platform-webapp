import React from "react";
import { Box, Chip, Typography } from "@mui/material";

const MAX_ARRAY_ITEMS = 3;

export const STATE_CHIP_SX = {
  bgcolor: "#e3f0fa",
  color: "primary.dark",
  border: "1px solid #7bb3de",
  borderRadius: 10,
} as const;

const isEmpty = (value: unknown) =>
  value === null ||
  value === undefined ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && !Array.isArray(value) && Object.keys(value as object).length === 0);

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const formatScalar = (value: unknown) => (isPlainObject(value) ? JSON.stringify(value) : String(value));

const formatList = (values: unknown[]) => {
  const shown = values.slice(0, MAX_ARRAY_ITEMS).map(formatScalar).join(", ");
  const rest = values.length - MAX_ARRAY_ITEMS;
  return rest > 0 ? `${shown} +${rest}` : shown;
};

// `{ column, direction }` (generic) or TanStack `{ id, desc }` sort entries
const isSortEntry = (value: unknown) =>
  isPlainObject(value) &&
  (("column" in value && "direction" in value) || ("id" in value && "desc" in value));

const formatSortEntry = (value: Record<string, any>) =>
  "column" in value ? `${value.column} ${value.direction}` : `${value.id} ${value.desc ? "desc" : "asc"}`;

// TanStack column filter entry: `{ id, value }`
const isColumnFilterEntry = (value: unknown) =>
  isPlainObject(value) && "id" in value && "value" in value && Object.keys(value).length === 2;

const formatEntry = (key: string, value: unknown, out: string[]) => {
  if (isEmpty(value)) return;

  if (isSortEntry(value)) {
    out.push(`sort = ${formatSortEntry(value as Record<string, any>)}`);
    return;
  }

  if (Array.isArray(value)) {
    if (value.every(isSortEntry)) {
      out.push(`sort = ${formatList(value.map(formatSortEntry))}`);
    } else if (value.every(isColumnFilterEntry)) {
      value.forEach(({ id, value: filterValue }) => {
        if (isEmpty(filterValue)) return;
        out.push(
          `${id} = ${Array.isArray(filterValue) ? formatList(filterValue) : formatScalar(filterValue)}`
        );
      });
    } else {
      out.push(`${key} = ${formatList(value)}`);
    }
    return;
  }

  if (isPlainObject(value)) {
    // TanStack pagination — only interesting when off the first page
    if ("pageIndex" in value && "pageSize" in value) {
      if (value.pageIndex > 0) out.push(`page = ${value.pageIndex + 1}`);
      return;
    }
    // TanStack row selection — `{ [rowId]: true }`
    if (key === "rowSelection") {
      const count = Object.values(value).filter(Boolean).length;
      if (count > 0) out.push(`selected = ${count} row${count === 1 ? "" : "s"}`);
      return;
    }
    // Namespaced bags (e.g. `otTable:<stem>`) — flatten their entries
    Object.entries(value).forEach(([childKey, childValue]) => formatEntry(childKey, childValue, out));
    return;
  }

  out.push(`${key === "globalFilter" ? "search" : key} = ${formatScalar(value)}`);
};

/**
 * Turn a section's captured componentState into short, human-readable labels
 */
export const formatComponentState = (state?: Record<string, any>): string[] => {
  const out: string[] = [];
  if (!state) return out;
  Object.entries(state).forEach(([key, value]) => formatEntry(key, value, out));
  return out;
};

/**
 * Summary chip for a collapsed row: the single entry, or "N filters"
 */
export const CapturedStateSummaryChip: React.FC<{ state?: Record<string, any> }> = ({ state }) => {
  const entries = formatComponentState(state);
  if (entries.length === 0) return null;
  return (
    <Chip
      size="small"
      label={entries.length === 1 ? entries[0] : `${entries.length} filters`}
      sx={{ ...STATE_CHIP_SX, fontFamily: '"Roboto Mono", monospace', fontSize: 11, flexShrink: 0 }}
    />
  );
};

/**
 * Full list of captured-state chips, used by the inspector
 */
export const CapturedStateChips: React.FC<{ state?: Record<string, any> }> = ({ state }) => {
  const entries = formatComponentState(state);

  if (entries.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontStyle: "italic", fontSize: "0.8rem", color: "grey.700" }}>
        Default view — no filters captured
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {entries.map((entry) => (
        <Chip
          key={entry}
          size="small"
          label={entry}
          sx={{ ...STATE_CHIP_SX, fontFamily: '"Roboto Mono", monospace', fontSize: 11, maxWidth: "100%" }}
        />
      ))}
    </Box>
  );
};

export default CapturedStateChips;
