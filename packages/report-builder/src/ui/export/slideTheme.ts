/**
 * Furniture from the Open Targets presentation template that the PPTX writer, the print HTML
 * and the step-2 preview all draw: the logo, and the diagonal panels on title and section
 * slides. Geometry is in slide inches (see `slideFrame`), so the three outputs agree.
 */
import { OT_LOGO_ASPECT, SLIDE_BRAND, SLIDE_TYPE } from "./layout";
import { type Box, type SlideFrame, formatLongDate, releaseLabel } from "./writers/shared";

// ---------- logo ----------

export type LogoVariant = "colour" | "white";

// apps/docs/public/OT_logo_colour.svg with the fills tokenised (the template's small
// bottom-right logo, and the white one on dark slides)
const LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4766 1444.5"><g><path fill="__BLUE__" d="M368,376h891c85.6,0,155,69.5,155,155h0c0,85.6-69.4,155-155,155H368v-310h0Z"/><path fill="__TINT__" d="M0,757h891c85.6,0,155,69.5,155,155h0c0,85.6-69.4,155-155,155H0v-310h0Z" transform="translate(1046 1824) rotate(180)"/><path fill="__TINT__" d="M888.5,0h0c84.7,0,153.5,68.8,153.5,153.5v153.5h-307v-153.5C735,68.8,803.8,0,888.5,0Z"/><path fill="__BLUE__" d="M522,1137.5h0c84.7,0,153.5,68.8,153.5,153.5v153.5h-307v-153.5c0-84.7,68.8-153.5,153.5-153.5Z" transform="translate(1044 2582) rotate(180)"/><path fill="__TEXT__" d="M1590.2,690.3v-.96c0-94.2,72.7-173,175.4-173s174.5,77.9,174.5,172.1v.96c0,94.2-72.7,173-175.4,173s-174.5-77.9-174.5-172.1ZM1878.4,690.3v-.96c0-65-47.3-119-113.8-119s-112.8,53.1-112.8,118.1v.96c0,65,47.3,118.5,113.8,118.5s112.8-52.6,112.8-117.6Z"/><path fill="__TEXT__" d="M2004.6,630.6c0-16.2,12.4-29.2,28.7-29.2s29.2,12.9,29.2,29.2v15.8c18.6-26.3,44.9-47.3,86-47.3,59.3,0,117.1,46.8,117.1,131v.96c0,83.7-57.4,131-117.1,131-42.1,0-68.3-21-86-44.4v89.4c0,16.3-12.9,28.7-29.2,28.7s-28.7-12.4-28.7-28.7v-276.3ZM2206.8,730.9v-.96c0-48.8-33-80.8-72.2-80.8s-73.6,32.5-73.6,80.8v.96c0,48.3,34.4,80.8,73.6,80.8s72.2-31.1,72.2-80.8Z"/><path fill="__TEXT__" d="M2441,862.4c-73.1,0-129.5-53.1-129.5-131v-.96c0-72.2,51.2-131.4,123.3-131.4,80.3,0,120,66,120,124.3,0,16.3-12.4,27.7-27.2,27.7h-158.2c6.2,41.1,35.4,64.1,72.7,64.1,24.4,0,43.5-8.6,59.8-22,4.3-3.3,8.1-5.3,14.8-5.3,12.9,0,22.9,10,22.9,23.4,0,7.2-3.3,13.4-7.6,17.7-22.9,20.6-51.6,33.5-90.8,33.5ZM2498.4,712.8c-3.8-37.3-25.8-66.4-64-66.4-35.4,0-60.2,27.3-65.5,66.4h129.5Z"/><path fill="__TEXT__" d="M2614.1,630.6c0-16.2,12.4-29.2,28.7-29.2s29.2,12.9,29.2,29.2v12.4c16.3-23.4,39.7-44,78.9-44,56.9,0,89.9,38.2,89.9,96.6v134.8c0,16.3-12.4,28.7-28.7,28.7s-29.2-12.4-29.2-28.7v-117.1c0-39.2-19.6-61.7-54-61.7s-56.9,23.4-56.9,62.6v116.2c0,16.3-12.9,28.7-29.2,28.7s-28.7-12.4-28.7-28.7v-199.8Z"/><path fill="__TEXT__" d="M3142.7,576.5h-81.3c-15.3,0-27.2-12.4-27.2-27.2s12-27.2,27.3-27.2h222.3c14.8,0,26.8,12.4,26.8,27.3s-11.9,27.3-26.8,27.3h-81.7v253.3c0,16.3-13.4,29.2-29.6,29.2s-29.6-12.9-29.6-29.2v-253.3Z"/><path fill="__TEXT__" d="M3292.3,784v-.96c0-54.5,42.5-81.3,104.2-81.3,28.2,0,48.3,4.3,67.9,10.5v-6.2c0-35.8-22-55-62.6-55-22,0-40.1,3.8-55.9,10-3.3.96-6.2,1.4-9.1,1.4-13.4,0-24.4-10.5-24.4-23.9,0-10.5,7.2-19.6,15.8-22.9,23.9-9.1,48.3-14.8,81.3-14.8,37.8,0,66,10,83.7,28.2,18.6,18.2,27.3,44.9,27.3,77.9v124.3c0,15.8-12.4,27.7-28.2,27.7-16.7,0-28.2-11.5-28.2-24.4v-9.6c-17.2,20.6-43.5,36.8-82.2,36.8-47.3,0-89.4-27.2-89.4-77.9ZM3465.4,765.8v-17.2c-14.8-5.7-34.4-10-57.4-10-37.3,0-59.3,15.8-59.3,42.1v.96c0,24.4,21.5,38.2,49.2,38.2,38.2,0,67.4-22,67.4-54Z"/><path fill="__TEXT__" d="M3589.7,630.6c0-16.2,12.4-29.2,28.7-29.2s29.2,12.9,29.2,29.2v25.8c13.4-31.5,38.2-55.4,63.6-55.4,18.2,0,28.7,12,28.7,28.7,0,15.3-10,25.3-22.9,27.7-41.1,7.2-69.3,38.7-69.3,98.5v74.6c0,15.8-12.9,28.7-29.2,28.7s-28.7-12.4-28.7-28.7v-199.8Z"/><path fill="__TEXT__" d="M3794.7,911.6c-10-3.8-16.2-11.9-16.2-22.9,0-12.9,11-23.9,24.4-23.9,4.3,0,7.7.96,10.5,2.4,22.9,12.9,48.3,20.1,77.4,20.1,51.6,0,79.8-26.8,79.8-77.4v-19.6c-21,27.3-47.3,46.4-88.9,46.4-59.3,0-114.7-44-114.7-118.1v-.96c0-74.6,55.9-118.5,114.7-118.5,42.5,0,68.8,19.6,88.4,43v-11.9c0-15.8,12.9-28.7,28.7-28.7s29.2,12.9,29.2,29.2v174.5c0,42.5-11,74.1-32,95.1-22.9,22.9-58.3,33.9-103.7,33.9-35.4,0-66.9-7.6-97.5-22.5ZM3971.1,718v-.96c0-41.1-33.9-69.3-74.1-69.3s-71.7,27.7-71.7,69.3v.96c0,41.1,32,69.3,71.7,69.3s74.1-28.2,74.1-69.3Z"/><path fill="__TEXT__" d="M4216.3,862.4c-73.1,0-129.5-53.1-129.5-131v-.96c0-72.2,51.2-131.4,123.3-131.4,80.3,0,120,66,120,124.3,0,16.3-12.4,27.7-27.2,27.7h-158.2c6.2,41.1,35.4,64.1,72.7,64.1,24.4,0,43.5-8.6,59.8-22,4.3-3.3,8.1-5.3,14.8-5.3,12.9,0,22.9,10,22.9,23.4,0,7.2-3.3,13.4-7.6,17.7-22.9,20.6-51.6,33.5-90.8,33.5ZM4273.7,712.8c-3.8-37.3-25.8-66.4-64-66.4-35.4,0-60.2,27.3-65.5,66.4h129.5Z"/><path fill="__TEXT__" d="M4401.3,786.9v-132.9h-9.6c-13.9,0-24.9-11-24.9-24.9s11-24.9,24.9-24.9h9.6v-43c0-15.8,12.9-28.7,29.2-28.7s28.7,12.9,28.7,28.7v43h45.4c13.9,0,25.3,11,25.3,24.9s-11.5,24.9-25.3,24.9h-45.4v123.8c0,22.5,11.5,31.6,31.1,31.6,6.7,0,12.4-1.4,14.3-1.4,12.9,0,24.4,10.5,24.4,23.9,0,10.5-7.2,19.1-15.3,22.5-12.4,4.3-24.4,6.7-39.7,6.7-42.5,0-72.7-18.6-72.7-74.1Z"/><path fill="__TEXT__" d="M4576.2,831.3c-6.2-3.3-11-10.5-11-20.1,0-12.9,10-23.4,23.4-23.4,4.8,0,9.1,1.4,12.4,3.4,24.4,16.3,49.7,24.4,72.7,24.4,24.9,0,39.2-10.5,39.2-27.2v-.96c0-19.6-26.8-26.3-56.4-35.4-37.3-10.5-78.9-25.8-78.9-74.1v-.96c0-47.8,39.7-77,89.9-77,26.8,0,55,7.7,79.4,20.6,8.1,4.3,13.9,12,13.9,22,0,13.4-10.5,23.4-23.9,23.4-4.8,0-7.6-.96-11.5-2.9-20.5-10.5-41.6-17.2-59.3-17.2-22.5,0-35.4,10.5-35.4,24.9v.96c0,18.6,27.3,26.3,56.9,35.9,36.8,11.5,78.4,28.2,78.4,73.6v.96c0,53.1-41.1,79.4-93.7,79.4-32,0-66.9-10-96.1-30.1Z"/></g></svg>';

const logoCache = new Map<LogoVariant, string>();

export function otLogoSvg(variant: LogoVariant): string {
  const cached = logoCache.get(variant);
  if (cached) return cached;
  const svg =
    variant === "white"
      ? LOGO_SVG.replace(/__(BLUE|TINT|TEXT)__/g, SLIDE_BRAND.white)
      : LOGO_SVG.replace(/__BLUE__/g, SLIDE_BRAND.blue)
          .replace(/__TINT__/g, "#aed0ea")
          .replace(/__TEXT__/g, SLIDE_BRAND.grey);
  logoCache.set(variant, svg);
  return svg;
}

/** <img> src for the logo (SVG as a data URL). */
export const otLogoDataUrl = (variant: LogoVariant): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(otLogoSvg(variant))}`;

// ---------- diagonal panels ----------

export interface Polygon {
  color: string;
  points: [number, number][]; // slide inches
}

export type DecorKind = "title" | "chapter";

/**
 * Title slide: a blue panel fills the right ~55% behind a steep diagonal, a navy triangle
 * sits in the bottom-right corner and a light-blue one in the bottom-left. Section slides keep
 * the blue top-right and navy bottom-right triangles.
 */
export function slideDecor(frame: Pick<SlideFrame, "W" | "H">, kind: DecorKind): Polygon[] {
  const { W, H } = frame;
  const navyCorner: Polygon = {
    color: SLIDE_BRAND.navy,
    points: [
      [0.61 * W, H],
      [W, 0.35 * H],
      [W, H],
    ],
  };
  if (kind === "title") {
    return [
      {
        color: SLIDE_BRAND.blue,
        points: [
          [0.43 * W, 0],
          [W, 0],
          [W, H],
          [0.6 * W, H],
        ],
      },
      {
        color: SLIDE_BRAND.blue50,
        points: [
          [0.56 * W, 0],
          [W, 0],
          [W, 0.52 * H],
        ],
      },
      navyCorner,
      {
        color: SLIDE_BRAND.blue50,
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
      color: SLIDE_BRAND.blue,
      points: [
        [0.44 * W, 0],
        [W, 0],
        [W, 0.78 * H],
      ],
    },
    navyCorner,
  ];
}

/** The panels as an inline SVG covering the slide (for the print HTML). */
export const decorSvgHtml = (frame: Pick<SlideFrame, "W" | "H">, kind: DecorKind): string =>
  `<svg viewBox="0 0 ${frame.W} ${frame.H}" preserveAspectRatio="none" aria-hidden="true" style="position:absolute;left:0;top:0;width:100%;height:100%">` +
  slideDecor(frame, kind)
    .map((p) => `<polygon fill="${p.color}" points="${p.points.map(([x, y]) => `${x},${y}`).join(" ")}"/>`)
    .join("") +
  "</svg>";

/** Text column on title and section slides: left of the diagonal, with a gap. */
export const decorTextWidth = (frame: Pick<SlideFrame, "W" | "margin">): number =>
  0.43 * frame.W - frame.margin - 0.3;

// ---------- title slide ----------

/** Rough body-text line count for `text` in a column `w` inches wide at ~14pt. */
const bodyLines = (text: string, w: number) => Math.ceil(text.length / Math.max(20, Math.floor(w * 9.5)));

export interface TitleSlideLayout {
  x: number;
  w: number;
  logo: Box;
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
 * optional description sized to its text, and the template's meta columns at ~69% height.
 */
export function titleSlideLayout(frame: SlideFrame, title: string, description?: string): TitleSlideLayout {
  const x = frame.margin;
  const w = decorTextWidth(frame);
  const logoW = Math.min(2.6, w * 0.6);
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
    logo: { x, y: 0.55, w: logoW, h: logoW / OT_LOGO_ASPECT },
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
export function titleMetaColumns(unit: {
  entityLabel?: string;
  dataRelease?: string;
  date: number;
}): { soft: string; strong: string }[] {
  const first = unit.entityLabel
    ? { soft: releaseLabel(unit.dataRelease), strong: unit.entityLabel }
    : { soft: "Platform report", strong: releaseLabel(unit.dataRelease) };
  return [first, { soft: "Generated", strong: formatLongDate(unit.date) }];
}
