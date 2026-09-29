/**
 * Layout constants shared by the HTML previews (step 2) and the writers, so the
 * preview and the output file agree on geometry, colours and type sizes.
 */
export const OT_COLORS = {
  primary: "#3489ca",
  primaryDark: "#1e6ba8",
  primaryLight: "#e3f0fa",
  text: "#212121",
  muted: "#9e9e9e",
  border: "#e0e0e0",
  finding: "#2e7d32",
  warning: "#ed6c02",
  info: "#0288d1",
};

export const FONT_FAMILY = "Inter, Arial, sans-serif";
export const MONO_FAMILY = "'Roboto Mono', Menlo, monospace";

/** Slide sizes in inches (PPTX units) and the px width widgets are rendered at. */
export const SLIDE_GEOMETRY = {
  "16:9": { widthIn: 13.333, heightIn: 7.5, widgetPx: 1600, maxTableCols: 7, layoutName: "OT_16x9" },
  "4:3": { widthIn: 10, heightIn: 7.5, widgetPx: 1200, maxTableCols: 5, layoutName: "OT_4x3" },
} as const;

export const SLIDE_TYPE = {
  titlePt: 28,
  bodyPt: 14,
  footerPt: 10,
  tablePt: 11,
  statementPt: 32,
};

// Right rail (filters + entity chips) on figure slides, as a fraction of slide width
export const SLIDE_RAIL_FRACTION = 0.24;
export const SLIDE_MARGIN_IN = 0.5;
export const APPENDIX_ROWS_PER_SLIDE = 15;
export const DEFAULT_TOP_N = 10;

/** Paper page sizes in mm and widget render widths in px. */
export const PAGE_SIZES = {
  A4: { widthMm: 210, heightMm: 297 },
  Letter: { widthMm: 215.9, heightMm: 279.4 },
} as const;
export const PAPER_MARGIN_MM = 18;
export const PAPER_WIDGET_PX = { fullWidth: 1050, halfColumn: 510 };
export const PAPER_MAX_TABLE = { cols: 8, rows: 25 };
export const PAPER_SPAN_TABLE_COLS = 5;
export const PAPER_SPAN_FIGURE_ASPECT = 1.6;

export const SLIDE_PIXEL_RATIO = 2;
export const PAPER_PIXEL_RATIO = 300 / 96;

export const WIDGET_TIMEOUT_MS = 15000;
