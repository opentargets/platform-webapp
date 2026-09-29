import React, { memo, ReactNode } from "react";
import { Box } from "@mui/material";
import {
  FONT_FAMILY,
  MONO_FAMILY,
  OT_COLORS,
  SLIDE_GEOMETRY,
  SLIDE_MARGIN_IN,
  SLIDE_RAIL_FRACTION,
  SLIDE_TYPE,
} from "../layout";
import type { MethodsEntry, Provenance, SlideUnit, SlidesSettings } from "../types";
import { CALLOUT_LABEL } from "../writers/shared";
import { docHtml, formatDate } from "./nodeMeta";
import { FigureView, PX_PER_IN, PX_PER_PT, RichHtml, ScaledBox, TableView } from "./previewParts";

const pt = (n: number) => n * PX_PER_PT;
const MARGIN = SLIDE_MARGIN_IN * PX_PER_IN;

const chipSx = {
  display: "inline-block",
  bgcolor: OT_COLORS.primaryLight,
  color: OT_COLORS.primaryDark,
  border: "1px solid #7bb3de",
  borderRadius: "999px",
  px: "10px",
  py: "3px",
  fontSize: pt(11),
  lineHeight: 1.3,
  maxWidth: "100%",
  overflowWrap: "anywhere",
} as const;

const SlideFrame: React.FC<{
  designWidth: number;
  designHeight: number;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  children: ReactNode;
  padded?: boolean;
}> = ({ designWidth, designHeight, footerLeft, footerRight, children, padded = true }) => (
  <Box
    sx={{
      width: designWidth,
      height: designHeight,
      bgcolor: "#fff",
      fontFamily: FONT_FAMILY,
      color: OT_COLORS.text,
      position: "relative",
      overflow: "hidden",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      p: padded ? `${MARGIN}px ${MARGIN}px ${MARGIN * 0.5}px` : 0,
    }}
  >
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</Box>
    {(footerLeft || footerRight) && (
      <Box
        sx={{
          display: "flex",
          gap: 3,
          alignItems: "flex-end",
          fontSize: pt(SLIDE_TYPE.footerPt),
          color: OT_COLORS.muted,
          pt: `${pt(6)}px`,
          ...(padded ? {} : { position: "absolute", left: MARGIN, right: MARGIN, bottom: MARGIN * 0.5 }),
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {footerLeft}
        </Box>
        <Box sx={{ flexShrink: 0 }}>{footerRight}</Box>
      </Box>
    )}
  </Box>
);

const SlideTitle: React.FC<{ kicker?: string; title: string }> = ({ kicker, title }) => (
  <Box sx={{ flexShrink: 0, mb: `${pt(10)}px` }}>
    {kicker && (
      <Box
        sx={{
          fontSize: pt(12),
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: OT_COLORS.primary,
          mb: `${pt(4)}px`,
        }}
      >
        {kicker}
      </Box>
    )}
    <Box
      sx={{
        fontSize: pt(SLIDE_TYPE.titlePt),
        fontWeight: 700,
        lineHeight: 1.15,
        pb: `${pt(6)}px`,
        borderBottom: `2px solid ${OT_COLORS.primary}`,
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}
    >
      {title}
    </Box>
  </Box>
);

const ProvenanceRail: React.FC<{ provenance: Provenance }> = ({ provenance }) => (
  <Box
    sx={{
      width: `${SLIDE_RAIL_FRACTION * 100}%`,
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: `${pt(8)}px`,
      fontSize: pt(11),
      overflow: "hidden",
    }}
  >
    {provenance.entity && (
      <Box>
        <Box sx={{ color: OT_COLORS.muted, mb: "4px" }}>Entity</Box>
        <Box sx={{ ...chipSx, bgcolor: "#fff" }}>
          {provenance.entity.label || provenance.entity.id}
        </Box>
      </Box>
    )}
    {provenance.filters.length > 0 && (
      <Box>
        <Box sx={{ color: OT_COLORS.muted, mb: "4px" }}>Filters</Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {provenance.filters.map((f) => (
            <Box key={f} sx={chipSx}>
              {f}
            </Box>
          ))}
        </Box>
      </Box>
    )}
    {provenance.sourceLabel && (
      <Box>
        <Box sx={{ color: OT_COLORS.muted, mb: "4px" }}>Source</Box>
        <Box>{provenance.sourceLabel}</Box>
      </Box>
    )}
  </Box>
);

const methodsCells = (e: MethodsEntry) => [
  e.figureLabel ? `${e.figureLabel} · ${e.title}` : e.title,
  e.sourceLabel ?? e.request?.endpoint ?? e.kind,
  e.filters.join("; "),
  e.dataRelease ?? "",
];

interface SlidePreviewProps {
  unit: SlideUnit;
  aspect: SlidesSettings["aspect"];
  index: number; // 0-based
  total: number;
  dataRelease?: string;
  width: number; // display width in px
}

/** HTML rendering of one planned slide, at PPTX geometry scaled to `width`. */
export const SlidePreview: React.FC<SlidePreviewProps> = memo(({ unit, aspect, index, total, dataRelease, width }) => {
  const geometry = SLIDE_GEOMETRY[aspect];
  const w = geometry.widthIn * PX_PER_IN;
  const h = geometry.heightIn * PX_PER_IN;
  const release = dataRelease ? `Open Targets ${dataRelease}` : "Open Targets";
  const numberText = `${index + 1} / ${total} · ${release}`;

  let content: ReactNode;
  switch (unit.kind) {
    case "titleSlide":
      content = (
        <SlideFrame designWidth={w} designHeight={h}>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: `${pt(12)}px` }}>
            {unit.entityLabel && (
              <Box sx={{ fontSize: pt(14), fontWeight: 700, color: OT_COLORS.primary, textTransform: "uppercase" }}>
                {unit.entityLabel}
              </Box>
            )}
            <Box sx={{ fontSize: pt(40), fontWeight: 700, lineHeight: 1.1 }}>{unit.title}</Box>
            <Box sx={{ width: pt(80), borderBottom: `3px solid ${OT_COLORS.primary}` }} />
            {unit.description && (
              <Box sx={{ fontSize: pt(SLIDE_TYPE.bodyPt + 2), color: "#616161", maxWidth: "80%" }}>
                {unit.description}
              </Box>
            )}
            <Box sx={{ fontSize: pt(SLIDE_TYPE.bodyPt), color: OT_COLORS.muted }}>
              {unit.dataRelease ? `Open Targets ${unit.dataRelease}` : "Open Targets Platform"} ·{" "}
              {formatDate(unit.date)}
            </Box>
          </Box>
        </SlideFrame>
      );
      break;
    case "chapterSlide":
      content = (
        <SlideFrame designWidth={w} designHeight={h} footerRight={numberText}>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: `${pt(10)}px` }}>
            <Box sx={{ fontSize: pt(16), fontWeight: 700, color: OT_COLORS.primary, fontFamily: MONO_FAMILY }}>
              {String(unit.n).padStart(2, "0")}
            </Box>
            <Box
              sx={{
                fontSize: pt(36),
                fontWeight: 700,
                lineHeight: 1.1,
                pb: `${pt(8)}px`,
                borderBottom: `2px solid ${OT_COLORS.primary}`,
              }}
            >
              {unit.title}
            </Box>
          </Box>
        </SlideFrame>
      );
      break;
    case "figureSlide": {
      const figureFooter = [unit.figureN ? `Fig ${unit.figureN}` : undefined, unit.caption]
        .filter(Boolean)
        .join(" · ");
      // Table moved to the appendix: the main slide keeps the takeaway and shows only the note
      const body = unit.table && unit.table.data.columns.length === 0 ? (
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `2px dashed ${OT_COLORS.border}`,
            color: OT_COLORS.muted,
            fontSize: pt(SLIDE_TYPE.bodyPt),
            textAlign: "center",
            p: 2,
          }}
        >
          {unit.table.note ?? "Full table in appendix"}
        </Box>
      ) : unit.table ? (
        <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 1 }}>
          <TableView table={unit.table} fontPx={pt(SLIDE_TYPE.tablePt)} maxCellChars={40} />
          {unit.table.note && (
            <Box sx={{ fontSize: pt(SLIDE_TYPE.footerPt), color: OT_COLORS.muted }}>{unit.table.note}</Box>
          )}
        </Box>
      ) : (
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          <FigureView asset={unit.asset} title={unit.title} caption={unit.caption} fill scale={1.5} />
        </Box>
      );
      if (unit.layout === "fullBleed") {
        content = (
          <SlideFrame designWidth={w} designHeight={h} padded={false} footerLeft={figureFooter} footerRight={numberText}>
            <Box sx={{ position: "absolute", inset: 0 }}>
              <FigureView asset={unit.asset} title={unit.title} caption={unit.caption} fill scale={1.5} />
            </Box>
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                px: `${MARGIN}px`,
                py: `${pt(12)}px`,
                bgcolor: "rgba(255,255,255,0.88)",
                borderBottom: `2px solid ${OT_COLORS.primary}`,
                fontSize: pt(SLIDE_TYPE.titlePt),
                fontWeight: 700,
                lineHeight: 1.15,
              }}
            >
              {unit.title}
            </Box>
          </SlideFrame>
        );
      } else {
        content = (
          <SlideFrame designWidth={w} designHeight={h} footerLeft={figureFooter} footerRight={numberText}>
            <SlideTitle kicker={unit.kicker} title={unit.title} />
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", gap: `${pt(16)}px` }}>
              {body}
              <ProvenanceRail provenance={unit.provenance} />
            </Box>
          </SlideFrame>
        );
      }
      break;
    }
    case "statementSlide":
      content = (
        <SlideFrame designWidth={w} designHeight={h} footerRight={numberText}>
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {unit.tone && (
              <Box
                sx={{
                  fontSize: pt(12),
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: OT_COLORS[unit.tone],
                  mb: `${pt(8)}px`,
                }}
              >
                {CALLOUT_LABEL[unit.tone]}
              </Box>
            )}
            <RichHtml
              html={docHtml(unit.doc)}
              sx={{
                fontSize: pt(SLIDE_TYPE.statementPt),
                fontWeight: 600,
                lineHeight: 1.25,
                borderLeft: `6px solid ${OT_COLORS[unit.tone ?? "finding"]}`,
                pl: `${pt(18)}px`,
                "& h2, & h3": { m: 0, fontSize: "inherit" },
              }}
            />
          </Box>
        </SlideFrame>
      );
      break;
    case "appendixTableSlide":
      content = (
        <SlideFrame
          designWidth={w}
          designHeight={h}
          footerLeft={unit.table.note ?? `Rows ${unit.table.shownFrom + 1}–${unit.table.shownFrom + unit.table.data.rows.length} of ${unit.table.totalRows}`}
          footerRight={numberText}
        >
          <SlideTitle
            kicker="Appendix"
            title={unit.pages > 1 ? `${unit.title} (${unit.page} / ${unit.pages})` : unit.title}
          />
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <TableView table={unit.table} fontPx={pt(SLIDE_TYPE.tablePt - 1)} maxCellChars={40} />
          </Box>
        </SlideFrame>
      );
      break;
    case "dataSourceSlide":
      content = (
        <SlideFrame
          designWidth={w}
          designHeight={h}
          footerLeft={`Retrieved ${formatDate(unit.retrievedAt)}`}
          footerRight={numberText}
        >
          <SlideTitle kicker="Appendix · data source" title={unit.title} />
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", fontSize: pt(12), display: "flex", flexDirection: "column", gap: `${pt(8)}px` }}>
            <Box sx={{ fontFamily: MONO_FAMILY, color: OT_COLORS.primaryDark, overflowWrap: "anywhere" }}>
              {unit.request.method ? `${unit.request.method} ` : ""}
              {unit.request.endpoint}
            </Box>
            {(unit.request.query || unit.request.body) && (
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: `${pt(8)}px`,
                  bgcolor: "#f5f5f5",
                  fontFamily: MONO_FAMILY,
                  fontSize: pt(10),
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                  flexShrink: 1,
                  minHeight: 0,
                }}
              >
                {unit.request.query ?? unit.request.body}
              </Box>
            )}
            {unit.request.variables !== undefined && (
              <Box component="pre" sx={{ m: 0, fontFamily: MONO_FAMILY, fontSize: pt(10), whiteSpace: "pre-wrap" }}>
                {JSON.stringify(unit.request.variables, null, 2)}
              </Box>
            )}
          </Box>
        </SlideFrame>
      );
      break;
    case "methodsSlide":
      content = (
        <SlideFrame designWidth={w} designHeight={h} footerRight={numberText}>
          <SlideTitle kicker="Appendix" title="Methods" />
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <TableView
              fontPx={pt(10)}
              maxCellChars={50}
              table={{
                shownFrom: 0,
                totalRows: unit.entries.length,
                data: {
                  columns: [
                    { key: "0", label: "Block" },
                    { key: "1", label: "Source" },
                    { key: "2", label: "Filters" },
                    { key: "3", label: "Release" },
                  ],
                  rows: unit.entries.map((e) => ({ ...methodsCells(e) })),
                  totalRows: unit.entries.length,
                },
              }}
            />
          </Box>
        </SlideFrame>
      );
      break;
    default:
      content = null;
  }

  return (
    <ScaledBox designWidth={w} designHeight={h} width={width}>
      {content}
    </ScaledBox>
  );
});

SlidePreview.displayName = "SlidePreview";

export default SlidePreview;
