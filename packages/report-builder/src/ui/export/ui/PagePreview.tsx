import React, { memo, ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { formatReference, orderReferences } from "../citations";
import { useReportConfig } from "../../../react";
import { PAGE_SIZES, PAPER_MARGIN_MM } from "../layout";
import type { PaperSettings, PaperUnit } from "../types";
import { docHtml, formatDate } from "./nodeMeta";
import { FigureView, PX_PER_MM, PX_PER_PT, RichHtml, ScaledBox, TableView } from "./previewParts";

const pt = (n: number) => n * PX_PER_PT;

export const PAPER_FONT = "Georgia, 'Times New Roman', serif";
const BODY_PT = 10;
const COLUMN_GAP_MM = 6;
const UNIT_GAP = pt(7);

export interface PageGeometry {
  width: number;
  height: number;
  margin: number;
  contentWidth: number;
  contentHeight: number;
  columnWidth: number;
  columns: 1 | 2;
}

export const pageGeometry = (paper: Pick<PaperSettings, "pageSize" | "columns">): PageGeometry => {
  const size = PAGE_SIZES[paper.pageSize];
  const width = size.widthMm * PX_PER_MM;
  const height = size.heightMm * PX_PER_MM;
  const margin = PAPER_MARGIN_MM * PX_PER_MM;
  const contentWidth = width - 2 * margin;
  const gap = COLUMN_GAP_MM * PX_PER_MM;
  return {
    width,
    height,
    margin,
    contentWidth,
    contentHeight: height - 2 * margin,
    columnWidth: paper.columns === 2 ? (contentWidth - gap) / 2 : contentWidth,
    columns: paper.columns,
  };
};

/** Units that take the full text width in a two-column layout. */
export const unitSpans = (unit: PaperUnit, columns: 1 | 2): boolean => {
  if (columns === 1) return true;
  if (unit.kind === "paperTitle") return true;
  if (unit.kind === "paperFigure" || unit.kind === "paperTable") return unit.span;
  // The heading that introduces the full-width supplementary tables
  if (unit.kind === "paperHeading") return unit.id === "paper-heading-supplementary";
  return false;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "(Fig. 2)" appended inside the last paragraph so it reads inline
const withFigRefs = (html: string, figRefs: string[]) => {
  if (!figRefs.length) return html;
  const suffix = ` (${escapeHtml(figRefs.join(", "))})`;
  const i = html.lastIndexOf("</p>");
  return i >= 0 ? `${html.slice(0, i)}${suffix}${html.slice(i)}` : `${html}<p>${suffix}</p>`;
};

const TONE_LABELS = { info: "Note", warning: "Caution", finding: "Finding" };

const SectionTitle: React.FC<{ children: ReactNode }> = ({ children }) => (
  <Box sx={{ fontSize: pt(12), fontWeight: 700, mb: `${pt(4)}px` }}>{children}</Box>
);

const captionSx = { fontSize: pt(8.5), lineHeight: 1.35, color: "#424242", mt: `${pt(3)}px` } as const;

/** One paper flow item, at print size. */
export const PaperUnitView: React.FC<{ unit: PaperUnit }> = memo(({ unit }) => {
  const { colors, fonts } = useReportConfig().branding.document;
  switch (unit.kind) {
    case "paperTitle":
      return (
        <Box sx={{ pb: `${pt(6)}px`, borderBottom: `1px solid ${colors.border}` }}>
          <Box sx={{ fontSize: pt(20), fontWeight: 700, lineHeight: 1.2 }}>{unit.title}</Box>
          <Box sx={{ fontSize: pt(9), fontStyle: "italic", color: colors.muted, mt: `${pt(4)}px` }}>
            {unit.byline}
          </Box>
          {unit.abstract && (
            <Box sx={{ fontSize: pt(9.5), mt: `${pt(8)}px`, lineHeight: 1.4 }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                Abstract.{" "}
              </Box>
              {unit.abstract}
            </Box>
          )}
        </Box>
      );
    case "paperHeading": {
      const size = unit.level === 1 ? 13 : unit.level === 2 ? 11 : 10;
      const number = unit.number ? `${unit.number}${unit.level === 1 ? " ·" : ""} ` : "";
      return (
        <Box
          sx={{
            fontSize: pt(size),
            fontWeight: 700,
            fontStyle: unit.level === 3 ? "italic" : "normal",
            color: unit.level === 1 ? colors.primaryDark : colors.text,
            pt: unit.level === 1 ? `${pt(4)}px` : 0,
          }}
        >
          {number}
          {unit.text}
        </Box>
      );
    }
    case "paperBody": {
      const html = withFigRefs(docHtml(unit.doc), unit.figRefs);
      const body = (
        <RichHtml
          html={html}
          sx={{
            fontSize: pt(BODY_PT),
            lineHeight: 1.45,
            textAlign: "justify",
            "& h2": { fontSize: pt(11), m: 0, mb: "0.3em" },
            "& h3": { fontSize: pt(10), fontStyle: "italic", m: 0, mb: "0.3em" },
            "& a": { color: colors.primaryDark },
          }}
        />
      );
      if (!unit.tone) return body;
      return (
        <Box
          sx={{
            border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors[unit.tone]}`,
            p: `${pt(5)}px ${pt(7)}px`,
            bgcolor: "#fafafa",
          }}
        >
          <Box sx={{ fontSize: pt(8), fontWeight: 700, textTransform: "uppercase", color: colors[unit.tone] }}>
            {TONE_LABELS[unit.tone]}
          </Box>
          {body}
        </Box>
      );
    }
    case "paperFigure":
      return (
        <Box>
          <FigureView asset={unit.asset} title={unit.title} caption={unit.caption} alt={unit.alt} />
          <Box sx={captionSx}>
            {unit.label && (
              <Box component="span" sx={{ fontWeight: 700 }}>
                {unit.label}.{" "}
              </Box>
            )}
            {unit.caption || unit.title}
          </Box>
        </Box>
      );
    case "paperTable":
      return (
        <Box>
          <Box sx={{ ...captionSx, mt: 0, mb: `${pt(3)}px` }}>
            {unit.label && (
              <Box component="span" sx={{ fontWeight: 700 }}>
                {unit.label}.{" "}
              </Box>
            )}
            {unit.title}
          </Box>
          <TableView table={unit.table} fontPx={pt(7.5)} maxCellChars={40} />
          {(unit.caption || unit.table.note) && (
            <Box sx={captionSx}>{[unit.caption, unit.table.note].filter(Boolean).join(" ")}</Box>
          )}
        </Box>
      );
    case "paperMethods":
      return (
        <Box>
          <SectionTitle>Methods</SectionTitle>
          {unit.entries.map((e) => (
            <Box key={e.nodeId} sx={{ fontSize: pt(8.5), lineHeight: 1.4, mb: `${pt(4)}px` }}>
              <Box component="span" sx={{ fontWeight: 700 }}>
                {e.figureLabel ? `${e.figureLabel} · ` : ""}
                {e.title}.{" "}
              </Box>
              {e.sourceLabel && `${e.sourceLabel}. `}
              {e.filters.length > 0 && `Filters: ${e.filters.join("; ")}. `}
              {e.dataRelease && `Release ${e.dataRelease}. `}
              Retrieved {formatDate(e.retrievedAt)}.{e.note ? ` ${e.note}.` : ""}
              {e.request && (
                <Box sx={{ fontFamily: fonts.monoStack, fontSize: pt(7.5), color: colors.primaryDark, overflowWrap: "anywhere" }}>
                  {e.request.method ? `${e.request.method} ` : ""}
                  {e.request.endpoint}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      );
    case "paperDataAvailability":
      return (
        <Box sx={{ fontSize: pt(9), lineHeight: 1.4 }}>
          <SectionTitle>Data availability</SectionTitle>
          <Box>{unit.text}</Box>
          {unit.links.map((l) => (
            <Box key={l.url} sx={{ overflowWrap: "anywhere", color: colors.primaryDark, fontSize: pt(8) }}>
              {l.label}: {l.url}
            </Box>
          ))}
        </Box>
      );
    case "paperReferences":
      return (
        <Box>
          <SectionTitle>References</SectionTitle>
          <Box component="ol" sx={{ m: 0, pl: `${pt(16)}px`, fontSize: pt(8), lineHeight: 1.35 }}>
            {orderReferences(unit.references, unit.style).map((r) => (
              <Box component="li" key={r.id} sx={{ mb: `${pt(2)}px`, overflowWrap: "anywhere" }}>
                {formatReference(r, unit.style)}
              </Box>
            ))}
          </Box>
        </Box>
      );
    default:
      return null;
  }
});

PaperUnitView.displayName = "PaperUnitView";

// ---------- pagination ----------

/** Approximate used height: span units stack; runs of column units are balanced over two columns. */
const usedHeight = (units: PaperUnit[], heights: Map<string, number>, columns: 1 | 2): number => {
  let total = 0;
  let run = 0;
  units.forEach((u) => {
    const h = heights.get(u.id) ?? 0;
    if (unitSpans(u, columns)) {
      total += Math.ceil(run / 2) + h;
      run = 0;
    } else {
      run += h;
    }
  });
  return total + Math.ceil(run / 2);
};

export const paginate = (
  units: PaperUnit[],
  heights: Map<string, number>,
  geometry: PageGeometry
): PaperUnit[][] => {
  const pages: PaperUnit[][] = [];
  let page: PaperUnit[] = [];
  units.forEach((unit) => {
    const candidate = [...page, unit];
    if (page.length > 0 && usedHeight(candidate, heights, geometry.columns) > geometry.contentHeight) {
      // Keep a heading with the content that follows it
      const last = page[page.length - 1];
      const carry = last.kind === "paperHeading" && page.length > 1 ? [page.pop()!] : [];
      pages.push(page);
      page = [...carry, unit];
    } else {
      page = candidate;
    }
  });
  if (page.length) pages.push(page);
  return pages;
};

/** Measures every unit at its laid-out width (hidden), then paginates. */
export const usePaperPages = (units: PaperUnit[], geometry: PageGeometry) => {
  const { colors } = useReportConfig().branding.document;
  const measureRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Map<string, number>>(() => new Map());

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const next = new Map<string, number>();
    root.querySelectorAll<HTMLElement>("[data-unit-id]").forEach((el) => {
      next.set(el.dataset.unitId!, el.offsetHeight);
    });
    setHeights((prev) => {
      if (prev.size === next.size && Array.from(next).every(([k, v]) => prev.get(k) === v)) return prev;
      return next;
    });
  });

  const pages = useMemo(() => paginate(units, heights, geometry), [units, heights, geometry]);

  const measurer = (
    <Box
      ref={measureRef}
      aria-hidden
      sx={{
        position: "absolute",
        left: -100000,
        top: 0,
        visibility: "hidden",
        pointerEvents: "none",
        fontFamily: PAPER_FONT,
        color: colors.text,
      }}
    >
      {units.map((u) => (
        <Box
          key={u.id}
          data-unit-id={u.id}
          sx={{ width: unitSpans(u, geometry.columns) ? geometry.contentWidth : geometry.columnWidth, pb: `${UNIT_GAP}px` }}
        >
          <PaperUnitView unit={u} />
        </Box>
      ))}
    </Box>
  );

  return { pages, measurer };
};

// ---------- one page ----------

interface PagePreviewProps {
  units: PaperUnit[];
  geometry: PageGeometry;
  pageNumber: number;
  pageCount: number;
  scale: number;
}

/** One paginated page: span units full width, runs of column units in CSS columns. */
export const PagePreview: React.FC<PagePreviewProps> = memo(({ units, geometry, pageNumber, pageCount, scale }) => {
  const { colors } = useReportConfig().branding.document;
  const segments: { span: boolean; units: PaperUnit[] }[] = [];
  units.forEach((u) => {
    const span = unitSpans(u, geometry.columns);
    const last = segments[segments.length - 1];
    if (last && last.span === span && !span) last.units.push(u);
    else segments.push({ span, units: [u] });
  });

  return (
    <ScaledBox
      designWidth={geometry.width}
      designHeight={geometry.height}
      width={geometry.width * scale}
      sx={{ boxShadow: "0 1px 4px rgba(0,0,0,0.2)", bgcolor: "#fff" }}
    >
      <Box
        sx={{
          width: geometry.width,
          height: geometry.height,
          bgcolor: "#fff",
          fontFamily: PAPER_FONT,
          color: colors.text,
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: geometry.margin,
            left: geometry.margin,
            width: geometry.contentWidth,
            height: geometry.contentHeight,
            overflow: "hidden",
          }}
        >
          {segments.map((seg) =>
            seg.span ? (
              <Box key={seg.units[0].id} sx={{ pb: `${UNIT_GAP}px` }}>
                <PaperUnitView unit={seg.units[0]} />
              </Box>
            ) : (
              <Box
                key={seg.units[0].id}
                sx={{ columnCount: 2, columnGap: `${COLUMN_GAP_MM * PX_PER_MM}px`, columnFill: "balance" }}
              >
                {seg.units.map((u) => (
                  <Box key={u.id} sx={{ breakInside: "avoid", pb: `${UNIT_GAP}px` }}>
                    <PaperUnitView unit={u} />
                  </Box>
                ))}
              </Box>
            )
          )}
        </Box>
        <Box
          sx={{
            position: "absolute",
            bottom: geometry.margin / 2 - pt(4),
            left: 0,
            right: 0,
            textAlign: "center",
            fontSize: pt(8),
            color: colors.muted,
          }}
        >
          {pageNumber} / {pageCount}
        </Box>
      </Box>
    </ScaledBox>
  );
});

PagePreview.displayName = "PagePreview";

export default PagePreview;
