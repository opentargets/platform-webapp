/**
 * Slide furniture that the PPTX writer, the print HTML and the step-2 preview all draw from the
 * host's branding: the logo, and the diagonal panels on title and section slides. Geometry is
 * in slide inches (see `slideFrame`), so the three outputs agree.
 */
import { type ExportBranding, type SlideColors, isSvgMarkup, logoAspect, releaseLabel } from "../../core";
import { SLIDE_TYPE } from "./layout";
import { type Box, type SlideFrame, formatLongDate, isSafeImageDataUrl, svgDataUrl } from "./writers/shared";

// ---------- logo ----------

/** The background the logo sits on: content slides are light, statement slides dark. */
export type LogoVariant = "light" | "dark";

/** The logo image for a background: inline SVG markup or a safe image data URL; undefined without one. */
export function logoImage(branding: Pick<ExportBranding, "logo">, variant: LogoVariant): string | undefined {
  const logo = branding.logo;
  if (!logo) return undefined;
  const image = variant === "dark" ? (logo.imageOnDark ?? logo.image) : logo.image;
  return isSvgMarkup(image) || isSafeImageDataUrl(image) ? image : undefined;
}

/** <img> src for the logo (SVG as a data URL), or undefined without one. */
export function logoSrc(branding: Pick<ExportBranding, "logo">, variant: LogoVariant): string | undefined {
  const image = logoImage(branding, variant);
  if (!image) return undefined;
  return isSvgMarkup(image) ? svgDataUrl(image) : image;
}

export const logoAlt = (branding: Pick<ExportBranding, "logo" | "organisation">): string =>
  branding.logo?.alt ?? branding.organisation ?? "Logo";

// ---------- diagonal panels ----------

export interface Polygon {
  color: string;
  points: [number, number][]; // slide inches
}

export type DecorKind = "title" | "chapter";

/**
 * Title slide: an accent panel fills the right ~55% behind a steep diagonal, a heading-colour
 * triangle sits in the bottom-right corner and a soft-accent one in the bottom-left. Section
 * slides keep the accent top-right and heading bottom-right triangles. Empty when the branding
 * turns decor off.
 */
export function slideDecor(
  frame: Pick<SlideFrame, "W" | "H">,
  kind: DecorKind,
  branding: Pick<ExportBranding, "slides">,
): Polygon[] {
  if (!branding.slides.decor) return [];
  const { W, H } = frame;
  const c: SlideColors = branding.slides.colors;
  const darkCorner: Polygon = {
    color: c.heading,
    points: [
      [0.61 * W, H],
      [W, 0.35 * H],
      [W, H],
    ],
  };
  if (kind === "title") {
    return [
      {
        color: c.accent,
        points: [
          [0.43 * W, 0],
          [W, 0],
          [W, H],
          [0.6 * W, H],
        ],
      },
      {
        color: c.accentSoft,
        points: [
          [0.56 * W, 0],
          [W, 0],
          [W, 0.52 * H],
        ],
      },
      darkCorner,
      {
        color: c.accentSoft,
        points: [
          [0, 0.7 * H],
          [0.17 * W, H],
          [0, H],
        ],
      },
    ];
  }
  return [
    {
      color: c.accent,
      points: [
        [0.44 * W, 0],
        [W, 0],
        [W, 0.78 * H],
      ],
    },
    darkCorner,
  ];
}

/** The panels as an inline SVG covering the slide (for the print HTML). */
export const decorSvgHtml = (
  frame: Pick<SlideFrame, "W" | "H">,
  kind: DecorKind,
  branding: Pick<ExportBranding, "slides">,
): string => {
  const polygons = slideDecor(frame, kind, branding);
  if (!polygons.length) return "";
  return (
    `<svg viewBox="0 0 ${frame.W} ${frame.H}" preserveAspectRatio="none" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%">` +
    polygons
      .map((p) => `<polygon fill="${p.color}" points="${p.points.map(([x, y]) => `${x},${y}`).join(" ")}"/>`)
      .join("") +
    "</svg>"
  );
};

/** Text column on title and section slides: left of the diagonal, with a gap. */
export const decorTextWidth = (frame: Pick<SlideFrame, "W" | "margin">): number =>
  0.43 * frame.W - frame.margin - 0.3;

// ---------- title slide ----------

/** Rough body-text line count for `text` in a column `w` inches wide at ~14pt. */
const bodyLines = (text: string, w: number) => Math.ceil(text.length / Math.max(20, Math.floor(w * 9.5)));

export interface TitleSlideLayout {
  x: number;
  w: number;
  logo?: Box; // undefined when the branding has no logo
  title: Box;
  titleFontPt: number; // deckTitlePt, stepped down until the title fits its box
  titleMaxLines: number;
  description?: Box;
  descriptionLines: number;
  meta: Box;
  metaColumnWidth: (count: number) => number;
}

/**
 * Title slide text column (left of the diagonal): logo, title growing up from the meta row,
 * optional description sized to its text, and the meta columns at ~69% height.
 */
export function titleSlideLayout(
  frame: SlideFrame,
  title: string,
  description: string | undefined,
  branding: Pick<ExportBranding, "logo">,
): TitleSlideLayout {
  const x = frame.margin;
  const w = decorTextWidth(frame);
  const aspect = logoAspect(branding);
  // Up to 60% of the column wide and 0.8in tall (a square logo shouldn't eat the title area)
  const logoH = aspect ? Math.min(0.8, Math.min(2.6, w * 0.6) / aspect) : 0;
  const logoW = aspect ? logoH * aspect : 0;
  const metaY = frame.H * 0.69;
  const descriptionLines = description?.trim() ? Math.min(4, bodyLines(description.trim(), w)) : 0;
  const descH = descriptionLines ? 0.08 + descriptionLines * 0.26 : 0;
  const titleTop = 1.5;
  const titleBottom = metaY - 0.2 - descH;
  const titleH = Math.max(0.8, titleBottom - titleTop);
  // Step the title down (36 → 22pt) until its estimated lines fit; the preview and print HTML
  // can't shrink text like PPTX does, so all three agree on the size chosen here
  const linesAt = (pt: number) => Math.ceil(title.length / Math.max(8, Math.floor((w * 72) / (pt * 0.62))));
  const maxLinesAt = (pt: number) => Math.max(1, Math.floor(titleH / ((pt * 1.05) / 72)));
  let titleFontPt = SLIDE_TYPE.deckTitlePt;
  while (titleFontPt > 22 && linesAt(titleFontPt) > maxLinesAt(titleFontPt)) titleFontPt -= 2;
  return {
    x,
    w,
    logo: aspect ? { x, y: 0.55, w: logoW, h: logoH } : undefined,
    title: { x, y: titleBottom - titleH, w, h: titleH },
    titleFontPt,
    titleMaxLines: maxLinesAt(titleFontPt),
    description: descriptionLines ? { x, y: titleBottom + 0.06, w, h: descH } : undefined,
    descriptionLines,
    meta: { x, y: metaY, w, h: 0.75 },
    metaColumnWidth: (count) => Math.min(2.2, w / Math.max(1, count)),
  };
}

/** Meta columns under the title ("OTAR0001 / Lab meeting · Presented by · date" in the template). */
export function titleMetaColumns(
  unit: { entityLabel?: string; dataRelease?: string; date: number },
  branding: Pick<ExportBranding, "organisation" | "platform" | "wording">,
): { soft: string; strong: string }[] {
  const release = releaseLabel(branding, unit.dataRelease);
  const first = unit.entityLabel
    ? { soft: release, strong: unit.entityLabel }
    : { soft: branding.wording.reportKind, strong: release };
  return [first, { soft: "Generated", strong: formatLongDate(unit.date) }].filter((c) => c.strong || c.soft);
}
