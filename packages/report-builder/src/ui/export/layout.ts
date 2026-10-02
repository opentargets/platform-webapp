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

/**
 * Widgets are rendered for export inside an off-screen iframe the size of a 16-inch MacBook
 * Pro display (1728 × 1117 CSS px at the default scaling), so media queries, viewport units and
 * fonts behave as on a real desktop screen rather than following the user's browser window.
 * `contentWidth` is the section column on that screen (Page grid: 24px padding, md=11 of 12).
 */
export const EXPORT_VIEWPORT = { width: 1728, height: 1117, contentWidth: 1516 } as const;

/** Slide sizes in inches (PPTX units) and the px width widgets are rendered at. */
export const SLIDE_GEOMETRY = {
  "16:9": {
    widthIn: 13.333,
    heightIn: 7.5,
    widgetPx: EXPORT_VIEWPORT.contentWidth,
    maxTableCols: 7,
    layoutName: "OT_16x9",
  },
  "4:3": { widthIn: 10, heightIn: 7.5, widgetPx: 1200, maxTableCols: 5, layoutName: "OT_4x3" },
} as const;

/**
 * Open Targets presentation template (Google Slides "Open Targets Presentation Template"):
 * navy headings in Trebuchet MS, Roboto body, OT Blue / Red / Grey with 50% and 30% tints,
 * diagonal blue and navy panels on the title and section slides, and the
 * small logo bottom-right of every content slide.
 */
export const SLIDE_BRAND = {
  navy: "#1c4a6d", // headings, dark panels, statement slides
  blue: "#3489ca", // Open Targets Blue
  blue50: "#99c4e4",
  blue30: "#c2dcef",
  red: "#ff6350", // Open Targets Red
  red50: "#ffb1a7",
  red30: "#ffd0ca",
  grey: "#5a5f5f", // Open Targets Grey: body text
  grey50: "#acafaf",
  grey30: "#cdcfcf",
  panel: "#eeeeee", // grey of the template's content box; used for figure placeholders
  white: "#ffffff",
} as const;

export const SLIDE_FONTS = {
  heading: "Trebuchet MS",
  body: "Roboto",
  mono: "Roboto Mono",
  headingStack: '"Trebuchet MS", "Inter", Arial, sans-serif',
  bodyStack: 'Roboto, "Inter", Arial, sans-serif',
  monoStack: "'Roboto Mono', Menlo, monospace",
} as const;

/** Callout tones on a light (content) and a dark (navy statement) background. */
export const SLIDE_TONE: Record<"finding" | "warning" | "info", { light: string; dark: string }> = {
  finding: { light: SLIDE_BRAND.blue, dark: SLIDE_BRAND.blue50 },
  warning: { light: SLIDE_BRAND.red, dark: SLIDE_BRAND.red50 },
  info: { light: SLIDE_BRAND.grey, dark: SLIDE_BRAND.grey30 },
};

/** "Open Targets" logo (icon + wordmark) width / height. */
export const OT_LOGO_ASPECT = 4766 / 1444.5;

export const SLIDE_TYPE = {
  deckTitlePt: 36,
  chapterPt: 36,
  kickerPt: 11,
  titlePt: 28,
  bodyPt: 14,
  footerPt: 10,
  tablePt: 11,
  statementPt: 30,
};

// Right rail (filters + entity chips) on figure slides, as a fraction of slide width
export const SLIDE_RAIL_FRACTION = 0.24;
export const SLIDE_MARGIN_IN = 0.6;
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

// Widget captures are bitmaps placed on a ~9.6in figure area: 3× the CSS size keeps text crisp
// when the deck is shown full screen on a Retina display (and is what Google Slides shows for
// SVG figures, which fall back to the PNG preview). Video frames are 1080p, 2× is plenty.
export const SLIDE_PIXEL_RATIO = 3;
export const VIDEO_PIXEL_RATIO = 2;
export const PAPER_PIXEL_RATIO = 300 / 96;

export const WIDGET_TIMEOUT_MS = 15000;
