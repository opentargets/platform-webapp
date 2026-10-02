import { formatCell } from "../richText/toHtml";
import type { PlacedTableLayout, TableData } from "../types";

/**
 * Column layout for tables on slides. Columns are sized from their formatted content, a long
 * label over a narrow column is drawn vertically (as the platform's own wide tables do), and
 * tables wider than the slide are split into column chunks that each repeat the first column.
 */

const CHAR_EM = 0.52; // average glyph width as a fraction of the font size (Roboto)
const HEADER_EM = 0.58; // bold
const CELL_PAD_IN = 0.14;
const MIN_COL_IN = 0.45; // fits "0.5192" at 10pt
const MAX_COL_IN = 1.8;
const MAX_KEY_COL_IN = 2.6; // first column (names)
const MAX_HEADER_IN = 1.8; // tallest rotated header
const ROTATE_ABOVE_CHARS = 6; // labels this short stay horizontal
const MAX_STRETCH = 1.6; // never widen a column more than this to fill the slide

export const charWidthIn = (pt: number, em = CHAR_EM) => (pt * em) / 72;

/** 11pt for tables that fit comfortably, 10pt once there are more columns than the slide geometry suggests. */
export const tableFontPt = (columns: number, maxTableCols: number) => (columns > maxTableCols ? 10 : 11);

export interface ColumnMeasure {
  index: number;
  width: number; // inches
  rotate: boolean;
}

export function measureColumns(data: TableData, fontPt: number): ColumnMeasure[] {
  const cw = charWidthIn(fontPt);
  const hw = charWidthIn(fontPt, HEADER_EM);
  return data.columns.map((col, index) => {
    let longest = 0;
    for (const row of data.rows) {
      const n = formatCell(row[col.key]).length;
      if (n > longest) longest = n;
    }
    const maxW = index === 0 ? MAX_KEY_COL_IN : MAX_COL_IN;
    const contentW = Math.min(maxW, Math.max(MIN_COL_IN, longest * cw + CELL_PAD_IN));
    const headerW = col.label.length * hw + CELL_PAD_IN;
    // A label is rotated when it would need more than two lines over its column, or would
    // break mid-word (single word wider than the column)
    const singleWord = !/\s/.test(col.label.trim());
    const rotate =
      col.label.length > ROTATE_ABOVE_CHARS && (headerW > contentW * 2 || (singleWord && headerW > contentW));
    const width = rotate ? contentW : Math.min(maxW, Math.max(contentW, headerW / 2));
    return { index, width, rotate };
  });
}

export interface ColumnChunk {
  indices: number[]; // into data.columns; key columns first
  layout: PlacedTableLayout;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

function layoutFor(data: TableData, cols: ColumnMeasure[], availableW: number, fontPt: number): PlacedTableLayout {
  const natural = sum(cols.map((c) => c.width));
  const scale = natural < availableW ? Math.min(availableW / natural, MAX_STRETCH) : 1;
  const hw = charWidthIn(fontPt, HEADER_EM);
  const maxHeaderChars = Math.max(4, Math.floor((MAX_HEADER_IN - CELL_PAD_IN) / hw));
  const rotatedH = Math.max(
    0,
    ...cols.map((c) =>
      c.rotate ? Math.min(data.columns[c.index].label.length, maxHeaderChars) * hw + CELL_PAD_IN : 0,
    ),
  );
  const twoLineHeaderH = (fontPt * 1.25 * 2) / 72 + 0.1;
  return {
    fontPt,
    widthsIn: cols.map((c) => c.width * scale),
    rotatedHeader: cols.map((c) => c.rotate),
    headerHeightIn: Math.min(MAX_HEADER_IN, Math.max(twoLineHeaderH, rotatedH)),
    rowHeightIn: (fontPt * 1.35) / 72 + 0.12,
    maxHeaderChars,
  };
}

/**
 * Packs columns into chunks no wider than `availableW`, each starting with the first
 * `keyColumns` columns. The chunk count comes from greedy packing; widths are then balanced so
 * the last chunk isn't a stub of two columns.
 */
export function chunkColumns(
  data: TableData,
  measures: ColumnMeasure[],
  availableW: number,
  fontPt: number,
  keyColumns = 1,
): ColumnChunk[] {
  const keys = measures.slice(0, Math.min(keyColumns, measures.length));
  const keyW = sum(keys.map((k) => k.width));
  const rest = measures.slice(keys.length);

  const pack = (limit: number): ColumnMeasure[][] => {
    const groups: ColumnMeasure[][] = [];
    let current: ColumnMeasure[] = [];
    let width = keyW;
    for (const m of rest) {
      if (current.length && width + m.width > limit) {
        groups.push(current);
        current = [];
        width = keyW;
      }
      current.push(m);
      width += m.width;
    }
    if (current.length || !groups.length) groups.push(current);
    return groups;
  };

  let groups = pack(availableW);
  const n = groups.length;
  if (n > 1) {
    // Aim for equal chunk widths; widen the target a little at a time if that needs an extra chunk
    let target = keyW + sum(rest.map((m) => m.width)) / n;
    for (let i = 0; i < 8 && target < availableW; i += 1) {
      const balanced = pack(target);
      if (balanced.length <= n) {
        groups = balanced;
        break;
      }
      target *= 1.05;
    }
  }
  return groups.map((group) => {
    const cols = [...keys, ...group];
    return { indices: cols.map((c) => c.index), layout: layoutFor(data, cols, availableW, fontPt) };
  });
}

/** Body rows that fit under the header in `areaH` inches, leaving room for the note line. */
export const rowsThatFit = (areaH: number, headerHeightIn: number, rowHeightIn: number, noteH = 0.4) =>
  Math.max(3, Math.floor((areaH - headerHeightIn - noteH) / rowHeightIn));

export const pickColumns = (data: TableData, indices: number[]): TableData => ({
  columns: indices.map((i) => data.columns[i]),
  rows: data.rows,
  totalRows: data.totalRows,
});

/** "columns 13–24 of 28" for a chunk (key columns excluded from the range). */
export const columnRangeNote = (chunk: ColumnChunk, total: number, keyColumns = 1): string => {
  const own = chunk.indices.slice(keyColumns);
  if (!own.length) return "";
  return `columns ${own[0] + 1}–${own[own.length - 1] + 1} of ${total}`;
};
