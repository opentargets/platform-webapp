import type { FigureAsset } from "../types";

// Interactive chrome that shouldn't appear in a static figure
const EXCLUDED_SELECTOR = "button, .MuiIconButton-root, .MuiTooltip-popper, [data-export-exclude]";

/**
 * Raster fallback: html-to-image PNG of `el` at `pixelRatio` (2 for slides,
 * 300/96 for paper). Width/height are CSS px; dpi = 96 × pixelRatio.
 */
export const rasterize = async (
  el: HTMLElement,
  pixelRatio: number
): Promise<Extract<FigureAsset, { kind: "raster" }>> => {
  const { toPng } = await import("html-to-image");
  const width = Math.ceil(el.scrollWidth || el.getBoundingClientRect().width);
  const height = Math.ceil(el.scrollHeight || el.getBoundingClientRect().height);
  const dataUrl = await toPng(el, {
    pixelRatio,
    backgroundColor: "#ffffff",
    width,
    height,
    cacheBust: true,
    filter: (node) => !(node instanceof Element && node.matches(EXCLUDED_SELECTOR)),
  });
  return { kind: "raster", dataUrl, width, height, dpi: Math.round(96 * pixelRatio) };
};

/** Natural size of an image data URL (0 × 0 when it can't be decoded, e.g. outside a browser). */
export const imageSize = (src: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve({ width: 0, height: 0 });
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = src;
  });
