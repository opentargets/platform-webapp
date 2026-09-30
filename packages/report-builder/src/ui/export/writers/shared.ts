/**
 * Helpers shared by the pptx / docx / print writers (no library imports, so they stay in
 * whichever chunk uses them).
 */
import { SLIDE_GEOMETRY, SLIDE_MARGIN_IN, SLIDE_RAIL_FRACTION } from "../layout";
import type { DataSourceRequest, FigureAsset, SlidesSettings } from "../types";

/** Lets the UI paint progress between units; setTimeout fallback so hidden tabs don't stall. */
export const yieldFrame = (): Promise<void> =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, 50);
    if (typeof requestAnimationFrame === "function")
      requestAnimationFrame(() => {
        clearTimeout(timer);
        resolve();
      });
  });

export const formatDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const releaseLabel = (release?: string): string =>
  release ? `Open Targets ${release}` : "Open Targets Platform";

export const SECRET_PLACEHOLDER = "••• omitted";

/** Header lines for a request; secret values never leave the tab. */
export const headerLines = (request: DataSourceRequest): { key: string; value: string }[] =>
  (request.headers ?? []).map((h) => ({ key: h.key, value: h.secret ? SECRET_PLACEHOLDER : h.value }));

export const stringifyVariables = (variables: unknown): string | undefined => {
  if (variables === undefined || variables === null) return undefined;
  if (typeof variables === "string") return variables;
  try {
    return JSON.stringify(variables, null, 2);
  } catch {
    return String(variables);
  }
};

const utf8ToBase64 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export const svgDataUrl = (svg: string): string => `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;

const SAFE_IMAGE_URL = /^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml)(;[a-z0-9=.+-]+)*;base64,[a-z0-9+/=\s]+$/i;

/** Only inline base64 images are allowed into outputs (no remote fetches, no javascript:). */
export const isSafeImageDataUrl = (url: string | undefined): url is string => !!url && SAFE_IMAGE_URL.test(url);

export const dataUrlMime = (url: string): string => url.slice(5, url.indexOf(";")).toLowerCase();

export const dataUrlToBytes = (url: string): Uint8Array => {
  const binary = atob(url.slice(url.indexOf(",") + 1).replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

/**
 * Rasterizes an SVG to a PNG data URL in the browser (canvas). Resolves undefined where
 * there is no DOM or the canvas is tainted, so callers can fall back gracefully.
 */
export async function svgToPngDataUrl(
  svg: string,
  width: number,
  height: number,
  scale = 2,
): Promise<string | undefined> {
  if (typeof document === "undefined" || typeof Image === "undefined") return undefined;
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = svgDataUrl(svg);
    await img.decode();
    const w = Math.max(1, Math.round((width || img.naturalWidth || 800) * scale));
    const h = Math.max(1, Math.round((height || img.naturalHeight || 600) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, w, h);
    context.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

/** PNG for an asset: the captured one, else rasterized from the SVG. */
export async function assetPng(asset: FigureAsset, scale = 2): Promise<string | undefined> {
  if (asset.kind === "raster") return isSafeImageDataUrl(asset.dataUrl) ? asset.dataUrl : undefined;
  if (asset.kind !== "svg") return undefined;
  if (isSafeImageDataUrl(asset.pngDataUrl)) return asset.pngDataUrl;
  return svgToPngDataUrl(asset.svg, asset.width, asset.height, scale);
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Largest box with the asset's aspect ratio that fits in `area`, centred. */
export const fitContain = (width: number, height: number, area: Box): Box => {
  const aspect = width > 0 && height > 0 ? width / height : 16 / 9;
  let w = area.w;
  let h = w / aspect;
  if (h > area.h) {
    h = area.h;
    w = h * aspect;
  }
  return { x: area.x + (area.w - w) / 2, y: area.y + (area.h - h) / 2, w, h };
};

/**
 * Slide frame in inches (PPTX units). The print HTML uses the same boxes scaled to the
 * page, so PPTX and PDF slides agree.
 */
export function slideFrame(aspect: SlidesSettings["aspect"]) {
  const geom = SLIDE_GEOMETRY[aspect];
  const W = geom.widthIn;
  const H = geom.heightIn;
  const m = SLIDE_MARGIN_IN;
  const railW = W * SLIDE_RAIL_FRACTION;
  const gap = 0.3;
  const footerY = H - 0.45;
  const contentY = 1.6;
  const contentH = footerY - 0.15 - contentY;
  return {
    geom,
    W,
    H,
    margin: m,
    kicker: { x: m, y: 0.3, w: W - 2 * m, h: 0.3 },
    title: { x: m, y: 0.58, w: W - 2 * m, h: 0.72 },
    ruleY: 1.38,
    content: { x: m, y: contentY, w: W - 2 * m, h: contentH },
    figure: { x: m, y: contentY, w: W - 2 * m - railW - gap, h: contentH },
    rail: { x: W - m - railW, y: contentY, w: railW, h: contentH },
    footer: { x: m, y: footerY, w: W - 2 * m, h: 0.3 },
    footerRight: { x: W - m - 3.2, y: footerY, w: 3.2, h: 0.3 },
    footerLeft: { x: m, y: footerY, w: W - 2 * m - 3.4, h: 0.3 },
  };
}

export type SlideFrame = ReturnType<typeof slideFrame>;

/** Chunks an array into pages of `size`. */
export const paginate = <T>(items: T[], size: number): T[][] => {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
};

export const CALLOUT_LABEL: Record<string, string> = { info: "Note", warning: "Warning", finding: "Finding" };

/** Error naming the unit's source block so the dialog can point at it. */
export const unitError = (e: unknown, unit: { nodeId?: string; kind: string }, where: string): Error => {
  const message = e instanceof Error ? e.message : String(e);
  return Object.assign(new Error(`Failed to render ${where} (${unit.kind}): ${message}`), {
    nodeId: unit.nodeId,
    cause: e,
  });
};
