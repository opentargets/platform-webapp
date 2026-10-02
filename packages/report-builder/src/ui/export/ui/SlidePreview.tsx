import React, { memo, type ReactNode } from "react";
import { Box } from "@mui/material";
import { SLIDE_BRAND, SLIDE_FONTS, SLIDE_TONE, SLIDE_TYPE } from "../layout";
import {
  type DecorKind,
  type LogoVariant,
  decorTextWidth,
  otLogoDataUrl,
  slideDecor,
  titleMetaColumns,
  titleSlideLayout,
} from "../slideTheme";
import type { MethodsEntry, Provenance, SlideUnit, SlidesSettings } from "../types";
import {
  type Box as Rect,
  CALLOUT_LABEL,
  type SlideFrame,
  formatDate,
  releaseLabel,
  slideFrame,
} from "../writers/shared";
import { docHtml } from "./nodeMeta";
import { FigureView, PX_PER_IN, PX_PER_PT, RichHtml, ScaledBox, TableView } from "./previewParts";

/**
 * HTML rendering of one planned slide in the Open Targets template style, laid out on the
 * same frame (slide inches) as the PPTX writer and the print HTML, then scaled to `width`.
 */

const px = (inches: number) => inches * PX_PER_IN;
const pt = (n: number) => n * PX_PER_PT;
const abs = (b: Rect) => ({
  position: "absolute" as const,
  left: px(b.x),
  top: px(b.y),
  width: px(b.w),
  height: px(b.h),
  boxSizing: "border-box" as const,
});
const B = SLIDE_BRAND;

const headSx = { fontFamily: SLIDE_FONTS.headingStack, fontWeight: 700, color: B.navy } as const;

const Decor: React.FC<{ frame: SlideFrame; kind: DecorKind }> = ({ frame, kind }) => (
  <svg
    viewBox={`0 0 ${frame.W} ${frame.H}`}
    preserveAspectRatio="none"
    aria-hidden="true"
    style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}
  >
    {slideDecor(frame, kind).map((p, i) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: static shapes
      <polygon key={i} fill={p.color} points={p.points.map(([x, y]) => `${x},${y}`).join(" ")} />
    ))}
  </svg>
);

const Logo: React.FC<{ box: Rect; variant: LogoVariant }> = ({ box, variant }) => (
  <Box
    component="img"
    src={otLogoDataUrl(variant)}
    alt="Open Targets"
    sx={{ ...abs(box), objectFit: "contain", display: "block" }}
  />
);

const Surface: React.FC<{ frame: SlideFrame; dark?: boolean; children: ReactNode }> = ({ frame, dark, children }) => (
  <Box
    sx={{
      width: px(frame.W),
      height: px(frame.H),
      bgcolor: dark ? B.navy : "#fff",
      color: dark ? "#fff" : B.grey,
      fontFamily: SLIDE_FONTS.bodyStack,
      position: "relative",
      overflow: "hidden",
    }}
  >
    {children}
  </Box>
);

const footerTextSx = {
  fontSize: pt(SLIDE_TYPE.footerPt),
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

/** Footer text left, release and slide number right, then the logo (white on dark slides). */
const Footer: React.FC<{ frame: SlideFrame; n: number; release: string; left?: string; dark?: boolean }> = ({
  frame,
  n,
  release,
  left,
  dark,
}) => {
  const color = dark ? B.blue30 : B.grey50;
  return (
    <>
      {dark && (
        <Box
          sx={{
            position: "absolute",
            left: px(frame.margin),
            top: px(frame.footer.y - 0.12),
            width: px(frame.W - 2 * frame.margin),
            height: "1px",
            bgcolor: B.blue50,
          }}
        />
      )}
      {left && <Box sx={{ ...abs(frame.footerLeft), ...footerTextSx, color }}>{left}</Box>}
      <Box sx={{ ...abs(frame.footerRight), ...footerTextSx, color, justifyContent: "flex-end" }}>{release}</Box>
      <Box sx={{ ...abs(frame.slideNumber), ...footerTextSx, color, justifyContent: "flex-end" }}>{n}</Box>
      <Logo box={frame.logo} variant={dark ? "white" : "colour"} />
    </>
  );
};

const Title: React.FC<{ frame: SlideFrame; title: string; kicker?: string }> = ({ frame, title, kicker }) => (
  <>
    {kicker && (
      <Box
        sx={{
          ...abs(frame.kicker),
          fontSize: pt(SLIDE_TYPE.kickerPt),
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: B.blue,
          display: "flex",
          alignItems: "flex-end",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {kicker}
      </Box>
    )}
    <Box sx={{ ...abs(frame.title), display: "flex", alignItems: "center", overflow: "hidden" }}>
      <Box
        sx={{
          ...headSx,
          fontSize: pt(SLIDE_TYPE.titlePt),
          lineHeight: 1.1,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </Box>
    </Box>
  </>
);

const chipSx = {
  fontSize: pt(11),
  lineHeight: 1.3,
  bgcolor: "#fff",
  color: B.grey,
  border: `1px solid ${B.grey30}`,
  borderRadius: `${pt(6)}px`,
  px: `${pt(6)}px`,
  py: `${pt(3)}px`,
  overflowWrap: "anywhere",
} as const;

const railLabelSx = {
  fontSize: pt(9),
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: B.grey50,
  mt: `${pt(8)}px`,
  "&:first-of-type": { mt: 0 },
} as const;

const Rail: React.FC<{ frame: SlideFrame; provenance: Provenance }> = ({ frame, provenance }) => {
  const e = provenance.entity;
  const entityLabel = e ? (e.label && e.label !== e.id ? `${e.label} · ${e.id}` : e.label || e.id) : undefined;
  return (
    <Box sx={{ ...abs(frame.rail), display: "flex", flexDirection: "column", gap: `${pt(5)}px`, overflow: "hidden" }}>
      {e && (
        <>
          <Box sx={railLabelSx}>{e.type || "Entity"}</Box>
          <Box sx={{ ...chipSx, bgcolor: B.blue30, borderColor: B.blue30, color: B.navy }}>{entityLabel}</Box>
        </>
      )}
      {provenance.filters.length > 0 && (
        <>
          <Box sx={railLabelSx}>Filters</Box>
          {provenance.filters.map((f) => (
            <Box key={f} sx={chipSx}>
              {f}
            </Box>
          ))}
        </>
      )}
      {provenance.sourceLabel && (
        <>
          <Box sx={railLabelSx}>Source</Box>
          <Box sx={{ fontSize: pt(10), color: B.grey }}>{provenance.sourceLabel}</Box>
        </>
      )}
    </Box>
  );
};

const Note: React.FC<{ children: ReactNode }> = ({ children }) => (
  <Box sx={{ fontSize: pt(11), fontStyle: "italic", color: B.grey, mt: `${pt(6)}px` }}>{children}</Box>
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
  total: number; // kept for the filmstrip caller; the template's footer shows only the slide number
  dataRelease?: string;
  width: number; // display width in px
}

export const SlidePreview: React.FC<SlidePreviewProps> = memo(({ unit, aspect, index, dataRelease, width }) => {
  const frame = slideFrame(aspect);
  const n = index + 1;
  const release = releaseLabel(dataRelease);

  let content: ReactNode;
  switch (unit.kind) {
    case "titleSlide": {
      const layout = titleSlideLayout(frame, unit.title, unit.description);
      const columns = titleMetaColumns(unit);
      const colW = layout.metaColumnWidth(columns.length);
      const clamp = (lines: number) => ({
        display: "-webkit-box",
        WebkitBoxOrient: "vertical" as const,
        WebkitLineClamp: lines,
        overflow: "hidden",
      });
      content = (
        <Surface frame={frame}>
          <Decor frame={frame} kind="title" />
          <Logo box={layout.logo} variant="colour" />
          <Box sx={{ ...abs(layout.title), display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
            <Box sx={{ ...headSx, ...clamp(layout.titleMaxLines), fontSize: pt(layout.titleFontPt), lineHeight: 1.05 }}>
              {unit.title}
            </Box>
          </Box>
          {layout.description && unit.description && (
            <Box sx={{ ...abs(layout.description), overflow: "hidden", fontSize: pt(14), color: B.grey }}>
              <Box sx={clamp(layout.descriptionLines)}>{unit.description.trim()}</Box>
            </Box>
          )}
          <Box sx={{ ...abs(layout.meta), display: "flex" }}>
            {columns.map((c) => (
              <Box key={c.soft} sx={{ width: px(colW - 0.15), mr: `${px(0.15)}px` }}>
                <Box sx={{ fontSize: pt(11), color: B.grey }}>{c.soft}</Box>
                <Box sx={{ fontSize: pt(13), fontWeight: 700, color: B.navy }}>{c.strong}</Box>
              </Box>
            ))}
          </Box>
        </Surface>
      );
      break;
    }
    case "chapterSlide": {
      const x = frame.margin;
      const w = decorTextWidth(frame) + 0.4;
      const y = frame.H * 0.33;
      content = (
        <Surface frame={frame}>
          <Decor frame={frame} kind="chapter" />
          <Box
            sx={{
              ...abs({ x, y, w, h: 0.4 }),
              fontSize: pt(14),
              fontWeight: 700,
              color: B.navy,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            PART {unit.n}
          </Box>
          <Box sx={{ position: "absolute", left: px(x), top: px(y + 0.55), width: px(w), height: "1px", bgcolor: B.grey50 }} />
          <Box
            sx={{
              ...abs({ x, y: y + 0.7, w, h: frame.H - (y + 0.7) - 0.8 }),
              ...headSx,
              fontSize: pt(SLIDE_TYPE.chapterPt),
              lineHeight: 1.05,
              overflow: "hidden",
            }}
          >
            {unit.title}
          </Box>
        </Surface>
      );
      break;
    }
    case "figureSlide": {
      const left = [unit.figureN ? `Fig ${unit.figureN}` : undefined, unit.caption, unit.dataNote]
        .filter(Boolean)
        .join(" · ");
      const figure = (box: Rect) =>
        unit.table && unit.table.data.columns.length === 0 ? (
          // Table moved to the appendix: the main slide keeps the takeaway and shows only the note
          <Box
            sx={{
              ...abs(box),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: pt(18),
              fontStyle: "italic",
              color: B.grey50,
              textAlign: "center",
            }}
          >
            {unit.table.note ?? "Full table in appendix"}
          </Box>
        ) : unit.table ? (
          <Box sx={{ ...abs(box), overflow: "hidden" }}>
            <TableView
              table={unit.table}
              variant="slides"
              fontPx={pt(unit.table.data.columns.length > frame.geom.maxTableCols ? 9 : SLIDE_TYPE.tablePt)}
              maxCellChars={40}
            />
            {unit.table.note && <Note>{unit.table.note}</Note>}
          </Box>
        ) : (
          <Box sx={abs(box)}>
            <FigureView asset={unit.asset} title={unit.title} caption={unit.caption} fill scale={1.5} />
          </Box>
        );
      if (unit.layout === "fullBleed") {
        content = (
          <Surface frame={frame}>
            {figure({ x: 0, y: 0, w: frame.W, h: frame.H })}
            <Box sx={{ position: "absolute", left: 0, top: 0, width: "100%", height: px(1.4), bgcolor: "rgba(255,255,255,0.9)" }} />
            <Box
              sx={{
                position: "absolute",
                left: 0,
                top: px(frame.footer.y - 0.15),
                width: "100%",
                height: px(frame.H - frame.footer.y + 0.15),
                bgcolor: "rgba(255,255,255,0.9)",
              }}
            />
            <Title frame={frame} title={unit.title} kicker={unit.kicker} />
            {left && <Box sx={{ ...abs(frame.footerLeft), ...footerTextSx, color: B.grey50 }}>{left}</Box>}
            <Logo box={frame.logo} variant="colour" />
          </Surface>
        );
      } else {
        content = (
          <Surface frame={frame}>
            <Title frame={frame} title={unit.title} kicker={unit.kicker} />
            {figure(frame.figure)}
            <Rail frame={frame} provenance={unit.provenance} />
            <Footer frame={frame} n={n} release={release} left={left || undefined} />
          </Surface>
        );
      }
      break;
    }
    case "statementSlide": {
      const tone = unit.tone;
      const toneColor = (tone ? SLIDE_TONE[tone] : SLIDE_TONE.finding).dark;
      const x = frame.margin + 0.4;
      const box = { x, y: frame.H * 0.2, w: frame.W - 2 * x, h: frame.H * 0.55 };
      content = (
        <Surface frame={frame} dark>
          {tone && (
            <Box
              sx={{
                ...abs({ x, y: box.y - 0.45, w: box.w, h: 0.35 }),
                fontSize: pt(12),
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: toneColor,
              }}
            >
              {CALLOUT_LABEL[tone]}
            </Box>
          )}
          <Box sx={{ ...abs(box), display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
            <RichHtml
              html={docHtml(unit.doc)}
              sx={{
                fontSize: pt(SLIDE_TYPE.statementPt),
                lineHeight: 1.2,
                color: "#fff",
                "& a": { color: B.blue30 },
                "& h2, & h3": { m: 0, fontSize: "inherit" },
              }}
            />
          </Box>
          <Footer frame={frame} n={n} release={release} dark />
        </Surface>
      );
      break;
    }
    case "appendixTableSlide": {
      const from = unit.table.shownFrom + 1;
      const to = unit.table.shownFrom + unit.table.data.rows.length;
      const note = unit.table.note ?? `Rows ${from}–${to} of ${unit.table.totalRows}`;
      content = (
        <Surface frame={frame}>
          <Title
            frame={frame}
            kicker={unit.pages > 1 ? `Appendix · ${unit.page} / ${unit.pages}` : "Appendix"}
            title={unit.title}
          />
          <Box sx={{ ...abs(frame.content), overflow: "hidden" }}>
            <TableView table={unit.table} variant="slides" fontPx={pt(SLIDE_TYPE.tablePt - 1)} maxCellChars={40} />
            <Note>{note}</Note>
          </Box>
          <Footer frame={frame} n={n} release={release} />
        </Surface>
      );
      break;
    }
    case "dataSourceSlide": {
      const area = frame.content;
      content = (
        <Surface frame={frame}>
          <Title frame={frame} kicker="Appendix · data source" title={unit.title} />
          <Box
            sx={{
              ...abs({ ...area, h: area.h - 0.35 }),
              overflow: "hidden",
              fontSize: pt(12),
              display: "flex",
              flexDirection: "column",
              gap: `${pt(8)}px`,
            }}
          >
            <Box sx={{ fontSize: pt(14), overflowWrap: "anywhere" }}>
              <Box component="strong" sx={{ color: B.navy }}>
                {unit.request.method ?? (unit.request.query ? "POST" : "GET")}
              </Box>{" "}
              <Box component="span" sx={{ fontFamily: SLIDE_FONTS.monoStack }}>
                {unit.request.endpoint}
              </Box>
            </Box>
            {(unit.request.query || unit.request.body) && (
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: `${pt(6)}px`,
                  bgcolor: "#fff",
                  border: `1px solid ${B.grey30}`,
                  fontFamily: SLIDE_FONTS.monoStack,
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
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: `${pt(6)}px`,
                  bgcolor: "#fff",
                  border: `1px solid ${B.grey30}`,
                  fontFamily: SLIDE_FONTS.monoStack,
                  fontSize: pt(10),
                  whiteSpace: "pre-wrap",
                  overflow: "hidden",
                }}
              >
                {JSON.stringify(unit.request.variables, null, 2)}
              </Box>
            )}
          </Box>
          <Box sx={{ ...abs({ ...area, y: area.y + area.h - 0.3, h: 0.3 }), fontSize: pt(11), fontStyle: "italic" }}>
            Retrieved {formatDate(unit.retrievedAt)}
          </Box>
          <Footer frame={frame} n={n} release={release} />
        </Surface>
      );
      break;
    }
    case "methodsSlide":
      content = (
        <Surface frame={frame}>
          <Title frame={frame} kicker="Appendix" title="Methods" />
          <Box sx={{ ...abs(frame.content), overflow: "hidden" }}>
            <TableView
              variant="slides"
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
          <Footer frame={frame} n={n} release={release} />
        </Surface>
      );
      break;
    default:
      content = null;
  }

  return (
    <ScaledBox designWidth={px(frame.W)} designHeight={px(frame.H)} width={width}>
      {content}
    </ScaledBox>
  );
});

SlidePreview.displayName = "SlidePreview";

export default SlidePreview;
