/**
 * Figure images for video scenes (spec §4): the IR asset as a decoded PNG plus its hash.
 * Hotspots are stored relative to this image, so the same PNG serves both aspect ratios.
 */
import type { ExportBranding } from "../../../core";
import type { FigureAsset, TableData, VideoScene } from "../types";
import { dataUrlToBytes, fitContain, isSafeImageDataUrl, svgToPngDataUrl } from "../writers/shared";

export interface SceneImage {
  source: HTMLImageElement;
  width: number;
  height: number;
  dataUrl: string;
  hash: string; // imageHash: first 16 hex chars of SHA-256 of the PNG bytes
}

// The larger of the two image boxes (16:9: 1180×900, 9:16: 1000×920) × 2
const RASTER_BOX = { w: 1180 * 2, h: 920 * 2 };

const TABLE_MAX_ROWS = 12;
const TABLE_MAX_COLS = 6;

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

/** SHA-256 when available (secure contexts); FNV-1a otherwise so hashes still compare. */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    return toHex(await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer)).slice(0, 16);
  }
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < bytes.length; i += 1) {
    h1 = Math.imul(h1 ^ bytes[i], 16777619);
    h2 = Math.imul(h2 ^ bytes[i], 2246822519);
  }
  return ((h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0")).slice(0, 16);
}

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toPrecision(3);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

const clip = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo)}…`;
};

/** Table nodes have no picture: draw the first rows as one, in the document palette and font. */
export function tableToPngDataUrl(data: TableData, branding: ExportBranding): string | undefined {
  if (typeof document === "undefined") return undefined;
  const colors = branding.document.colors;
  const font = branding.document.fonts.bodyStack;
  const cols = data.columns.slice(0, TABLE_MAX_COLS);
  const rows = data.rows.slice(0, TABLE_MAX_ROWS);
  const total = Math.max(data.totalRows, data.rows.length);
  const width = 2000;
  const rowH = 76;
  const pad = 20;
  const footer = total > rows.length || data.columns.length > cols.length ? 70 : 0;
  const height = (rows.length + 1) * rowH + footer + pad;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  const colW = (width - pad * 2) / Math.max(1, cols.length);
  ctx.textBaseline = "middle";

  ctx.fillStyle = colors.primaryLight;
  ctx.fillRect(pad, pad, width - pad * 2, rowH);
  ctx.font = `700 30px ${font}`;
  ctx.fillStyle = colors.text;
  cols.forEach((c, i) => ctx.fillText(clip(ctx, c.label, colW - 28), pad + i * colW + 14, pad + rowH / 2));

  ctx.font = `400 30px ${font}`;
  rows.forEach((row, r) => {
    const y = pad + (r + 1) * rowH;
    ctx.fillStyle = colors.border;
    ctx.fillRect(pad, y, width - pad * 2, 2);
    ctx.fillStyle = colors.text;
    cols.forEach((c, i) => ctx.fillText(clip(ctx, cellText(row[c.key]), colW - 28), pad + i * colW + 14, y + rowH / 2));
  });
  if (footer) {
    ctx.font = `400 26px ${font}`;
    ctx.fillStyle = colors.muted;
    const parts = [
      total > rows.length ? `Showing ${rows.length} of ${total} rows` : "",
      data.columns.length > cols.length ? `${cols.length} of ${data.columns.length} columns` : "",
    ].filter(Boolean);
    ctx.fillText(parts.join(" · "), pad + 14, height - footer / 2);
  }
  return canvas.toDataURL("image/png");
}

async function assetDataUrl(asset: FigureAsset): Promise<string | undefined> {
  if (asset.kind === "raster") return isSafeImageDataUrl(asset.dataUrl) ? asset.dataUrl : undefined;
  if (asset.kind !== "svg") return undefined;
  if (isSafeImageDataUrl(asset.pngDataUrl)) return asset.pngDataUrl;
  // Rasterize once at the image box size × 2 (the SVG scales, so fit its aspect ratio into the box)
  const fitted = fitContain(asset.width || 800, asset.height || 600, { x: 0, y: 0, ...RASTER_BOX });
  return svgToPngDataUrl(asset.svg, fitted.w, fitted.h, 1);
}

async function decode(dataUrl: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.decoding = "async";
  img.src = dataUrl;
  await img.decode();
  return img;
}

async function build(
  source: FigureAsset | TableData,
  isTable: boolean,
  branding: ExportBranding
): Promise<SceneImage | undefined> {
  const dataUrl = isTable ? tableToPngDataUrl(source as TableData, branding) : await assetDataUrl(source as FigureAsset);
  if (!dataUrl) return undefined;
  const [img, hash] = await Promise.all([decode(dataUrl), hashBytes(dataUrlToBytes(dataUrl))]);
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, dataUrl, hash };
}

// One entry per block for the dialog session; a re-collected asset (new object) replaces it
const cache = new Map<string, { key: object; image: Promise<SceneImage | undefined> }>();

/** The scene's figure image, or undefined for scenes without one (or a figure that failed). */
export function sceneImage(
  scene: Pick<VideoScene, "blockId" | "asset" | "table">,
  branding: ExportBranding
): Promise<SceneImage | undefined> {
  const key = scene.asset ?? scene.table;
  if (!scene.blockId || !key || (scene.asset && scene.asset.kind === "missing")) return Promise.resolve(undefined);
  const hit = cache.get(scene.blockId);
  if (hit && hit.key === key) return hit.image;
  const image = build(key, !scene.asset, branding).catch(() => undefined);
  cache.set(scene.blockId, { key, image });
  return image;
}

export const clearSceneImages = () => cache.clear();
