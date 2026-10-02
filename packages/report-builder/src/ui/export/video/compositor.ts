/**
 * Scene rendering (spec §5): one pure drawing function used by the storyboard preview, the
 * hotspot editor preview and the recorder, so what is previewed is what gets recorded.
 * Everything is drawn in frame coordinates (1080×1920 or 1920×1080); callers scale the context.
 */
import { type BrandFonts, type DocumentColors, type ExportBranding, platformLabel } from "../../../core";
import type { Hotspot, VideoAspect, VideoScene, VideoSettings } from "../types";
import { type Box, fitContain } from "../writers/shared";
import type { SceneImage } from "./images";
import { type SceneTiming, sentenceRanges, tokenize } from "./tts";

export const FRAME_SIZE: Record<VideoAspect, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
};

export const HOTSPOT_COLOR = "#ff6350";
const TITLE_COLOR = "#616161";
const CAPTION_BG = "rgba(0,0,0,0.72)";
const SPOTLIGHT_FILL = "rgba(255,255,255,0.6)";
export const CROSSFADE_S = 0.3;
const HOTSPOT_IN_S = 0.25;
const CAPTION_HOLD_S = 0.5;

// ---------- layouts (§5.1) ----------

export interface Layout {
  aspect: VideoAspect;
  width: number;
  height: number;
  kicker: { x: number; y: number; w: number; size: number };
  title: { x: number; y: number; w: number; size: number; lineHeight: number; maxLines: number };
  imageBox: Box;
  captionBand: Box;
  captionSize: number;
  footer: { left: number; right: number; baseline: number; size: number };
  // Title, statement and end scenes (no figure)
  text: Box;
  display: { title: number; statement: number; subtitle: number };
}

export function layoutFor(aspect: VideoAspect): Layout {
  if (aspect === "9:16") {
    return {
      aspect,
      ...FRAME_SIZE[aspect],
      kicker: { x: 60, y: 120, w: 960, size: 30 },
      title: { x: 60, y: 176, w: 960, size: 64, lineHeight: 76, maxLines: 3 },
      imageBox: { x: 40, y: 560, w: 1000, h: 920 },
      captionBand: { x: 40, y: 1560, w: 1000, h: 200 },
      captionSize: 40,
      footer: { left: 60, right: 1020, baseline: 1860, size: 24 },
      text: { x: 80, y: 360, w: 920, h: 1160 },
      display: { title: 88, statement: 64, subtitle: 38 },
    };
  }
  return {
    aspect,
    ...FRAME_SIZE[aspect],
    kicker: { x: 1300, y: 100, w: 560, size: 30 },
    title: { x: 1300, y: 152, w: 560, size: 56, lineHeight: 66, maxLines: 9 },
    imageBox: { x: 60, y: 90, w: 1180, h: 900 },
    captionBand: { x: 1300, y: 830, w: 560, h: 160 },
    captionSize: 34,
    footer: { left: 60, right: 1860, baseline: 1045, size: 24 },
    text: { x: 200, y: 140, w: 1520, h: 700 },
    display: { title: 84, statement: 60, subtitle: 38 },
  };
}

/** The branding's document palette and fonts, as the compositor draws with them. */
interface Style {
  fonts: BrandFonts;
  colors: DocumentColors;
}
const styleOf = (branding: ExportBranding): Style => ({ fonts: branding.document.fonts, colors: branding.document.colors });

const font = (st: Style, weight: number, size: number, mono = false) =>
  `${weight} ${size}px ${mono ? st.fonts.monoStack : st.fonts.bodyStack}`;

const fontSpecs = (st: Style) => [
  font(st, 700, 88),
  font(st, 700, 64),
  font(st, 700, 56),
  font(st, 600, 30),
  font(st, 500, 40),
  font(st, 400, 24),
  font(st, 400, 30, true),
];

/** Waits for the fonts the compositor uses (resolves even when a face isn't available). */
export async function ensureFonts(branding: ExportBranding): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(fontSpecs(styleOf(branding)).map((f) => document.fonts.load(f).catch(() => [])));
}

// ---------- text ----------

const ellipsize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
};

/** Word-wraps with the context's current font; the last allowed line gets an ellipsis. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = Infinity): string[] {
  const lines: string[] = [];
  let line = "";
  text
    .split(/\s+/)
    .filter(Boolean)
    .forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        return;
      }
      if (line) lines.push(line);
      line = word;
      // A single word wider than the line: break it by characters
      while (ctx.measureText(line).width > maxWidth && line.length > 1) {
        let n = line.length - 1;
        while (n > 1 && ctx.measureText(line.slice(0, n)).width > maxWidth) n -= 1;
        lines.push(line.slice(0, n));
        line = line.slice(n);
      }
    });
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]} ${lines[maxLines]}`, maxWidth);
    return kept;
  }
  return lines;
}

const roundRectPath = (ctx: CanvasRenderingContext2D, r: Box, radius: number) => {
  const rad = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  ctx.beginPath();
  ctx.moveTo(r.x + rad, r.y);
  ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, rad);
  ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, rad);
  ctx.arcTo(r.x, r.y + r.h, r.x, r.y, rad);
  ctx.arcTo(r.x, r.y, r.x + r.w, r.y, rad);
  ctx.closePath();
};

// ---------- captions (§5.3) ----------

export interface CaptionCue {
  start: number; // seconds in scene
  end: number;
  lines: string[];
  fromWord: number;
  toWord: number; // exclusive
}

// Line breaks depend only on the narration and the aspect; times are applied per call
const cueLayoutCache = new Map<string, { lines: string[]; fromWord: number; toWord: number }[]>();

const captionMaxWidth = (layout: Layout) => layout.captionBand.w - 64;

function cueLayout(ctx: CanvasRenderingContext2D, narration: string, layout: Layout, st: Style) {
  const key = `${layout.aspect}\u0000${st.fonts.bodyStack}\u0000${narration}`;
  const hit = cueLayoutCache.get(key);
  if (hit) return hit;
  const words = tokenize(narration);
  const out: { lines: string[]; fromWord: number; toWord: number }[] = [];
  ctx.save();
  ctx.font = font(st, 500, layout.captionSize);
  const maxWidth = captionMaxWidth(layout);
  sentenceRanges(words).forEach(([from, to]) => {
    // Greedy lines over word indices, then chunks of two lines
    const lines: { text: string; from: number; to: number }[] = [];
    let cur = { text: "", from, to: from };
    for (let i = from; i < to; i += 1) {
      const test = cur.text ? `${cur.text} ${words[i].text}` : words[i].text;
      if (!cur.text || ctx.measureText(test).width <= maxWidth) cur = { text: test, from: cur.from, to: i + 1 };
      else {
        lines.push(cur);
        cur = { text: words[i].text, from: i, to: i + 1 };
      }
    }
    if (cur.text) lines.push(cur);
    for (let i = 0; i < lines.length; i += 2) {
      const pair = lines.slice(i, i + 2);
      out.push({
        lines: pair.map((l) => ellipsize(ctx, l.text, maxWidth)),
        fromWord: pair[0].from,
        toWord: pair[pair.length - 1].to,
      });
    }
  });
  ctx.restore();
  if (cueLayoutCache.size > 200) cueLayoutCache.delete(cueLayoutCache.keys().next().value!);
  cueLayoutCache.set(key, out);
  return out;
}

/**
 * Caption cues for a scene: a sentence at a time (split into two-line chunks when longer),
 * advancing on word times. The .srt file is built from the same cues.
 */
export function captionCues(
  ctx: CanvasRenderingContext2D,
  narration: string,
  timing: Pick<SceneTiming, "wordTimes" | "speechS">,
  layout: Layout,
  branding: ExportBranding
): CaptionCue[] {
  const chunks = cueLayout(ctx, narration, layout, styleOf(branding));
  const at = (i: number) => timing.wordTimes[Math.min(i, timing.wordTimes.length - 1)] ?? 0;
  return chunks.map((c, i) => ({
    ...c,
    start: i === 0 ? 0 : at(c.fromWord),
    end: i < chunks.length - 1 ? at(chunks[i + 1].fromWord) : timing.speechS + CAPTION_HOLD_S,
  }));
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** A context for measuring text outside a draw (building the .srt). */
export const measuringContext = (): CanvasRenderingContext2D => {
  measureCtx ??= document.createElement("canvas").getContext("2d")!;
  return measureCtx;
};

function drawCaptions(ctx: CanvasRenderingContext2D, cue: CaptionCue, layout: Layout, st: Style) {
  const band = layout.captionBand;
  const size = layout.captionSize;
  const lineH = Math.round(size * 1.3);
  const padY = 22;
  ctx.save();
  ctx.font = font(st, 500, size);
  const textW = Math.max(...cue.lines.map((l) => ctx.measureText(l).width));
  const boxW = Math.min(band.w, textW + 64);
  const boxH = cue.lines.length * lineH + padY * 2;
  // Bottom-anchored in the band, centred horizontally
  const box = { x: band.x + (band.w - boxW) / 2, y: band.y + band.h - boxH, w: boxW, h: boxH };
  ctx.fillStyle = CAPTION_BG;
  roundRectPath(ctx, box, 12);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  cue.lines.forEach((l, i) => ctx.fillText(l, box.x + box.w / 2, box.y + padY + lineH * i + lineH / 2));
  ctx.restore();
}

// ---------- hotspots (§5.2) ----------

export const hotspotStartS = (h: Hotspot, wordTimes: number[]): number => {
  if (h.start.type === "time") return h.start.s;
  if (!wordTimes.length) return 0;
  return wordTimes[Math.max(0, Math.min(h.start.index, wordTimes.length - 1))];
};

export const hotspotEndS = (h: Hotspot, durationS: number): number =>
  h.end === "scene" ? durationS : h.end.s;

const easeOut = (p: number) => 1 - (1 - p) ** 3;

/** Maps image-relative (0–1) coordinates onto the fitted image rectangle in the frame. */
export const toFrame = (fit: Box, r: { x: number; y: number; w?: number; h?: number }): Box => ({
  x: fit.x + r.x * fit.w,
  y: fit.y + r.y * fit.h,
  w: (r.w ?? 0) * fit.w,
  h: (r.h ?? 0) * fit.h,
});

const scaleAbout = (r: Box, s: number): Box => {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return { x: cx - (r.w * s) / 2, y: cy - (r.h * s) / 2, w: r.w * s, h: r.h * s };
};

/** Where a line from `from` towards the rectangle's centre crosses its edge. */
export const arrowTip = (from: { x: number; y: number }, r: Box): { x: number; y: number } => {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = cx - from.x;
  const dy = cy - from.y;
  const inside = from.x >= r.x && from.x <= r.x + r.w && from.y >= r.y && from.y <= r.y + r.h;
  if (inside || (dx === 0 && dy === 0)) return { x: cx, y: cy };
  const tx = dx !== 0 ? ((dx > 0 ? r.x : r.x + r.w) - from.x) / dx : -Infinity;
  const ty = dy !== 0 ? ((dy > 0 ? r.y : r.y + r.h) - from.y) / dy : -Infinity;
  const t = Math.max(0, Math.min(1, Math.max(tx, ty)));
  return { x: from.x + dx * t, y: from.y + dy * t };
};

let spotlightLayer: HTMLCanvasElement | null = null;

function drawSpotlight(ctx: CanvasRenderingContext2D, holes: Box[], alpha: number, layout: Layout) {
  const { width, height } = ctx.canvas;
  spotlightLayer ??= document.createElement("canvas");
  if (spotlightLayer.width !== width || spotlightLayer.height !== height) {
    spotlightLayer.width = width;
    spotlightLayer.height = height;
  }
  const l = spotlightLayer.getContext("2d")!;
  l.setTransform(1, 0, 0, 1, 0, 0);
  l.clearRect(0, 0, width, height);
  l.setTransform(ctx.getTransform());
  l.fillStyle = SPOTLIGHT_FILL;
  l.fillRect(0, 0, layout.width, layout.height);
  l.globalCompositeOperation = "destination-out";
  holes.forEach((r) => {
    roundRectPath(l, r, 6);
    l.fill();
  });
  l.globalCompositeOperation = "source-over";
  const base = ctx.globalAlpha;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = base * alpha;
  ctx.drawImage(spotlightLayer, 0, 0);
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, label: string, r: Box, bounds: Box, st: Style) {
  ctx.font = font(st, 600, 30);
  const text = ellipsize(ctx, label, bounds.w - 40);
  const w = ctx.measureText(text).width + 32;
  const h = 48;
  const gap = 12;
  let y = r.y + r.h + gap;
  if (y + h > bounds.y + bounds.h) y = r.y - gap - h;
  y = Math.max(bounds.y, y);
  const x = Math.max(bounds.x, Math.min(r.x + r.w / 2 - w / 2, bounds.x + bounds.w - w));
  ctx.fillStyle = HOTSPOT_COLOR;
  roundRectPath(ctx, { x, y, w, h }, h / 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
}

function drawHotspotShape(ctx: CanvasRenderingContext2D, h: Hotspot, r: Box, fit: Box) {
  ctx.strokeStyle = HOTSPOT_COLOR;
  ctx.fillStyle = HOTSPOT_COLOR;
  ctx.lineWidth = 6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (h.shape === "box") {
    roundRectPath(ctx, r, 6);
    ctx.stroke();
  } else if (h.shape === "ring") {
    ctx.beginPath();
    ctx.ellipse(r.x + r.w / 2, r.y + r.h / 2, Math.max(1, r.w / 2), Math.max(1, r.h / 2), 0, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    const fromRel = h.arrowFrom ?? defaultArrowFrom(h.rect);
    const from = toFrame(fit, fromRel);
    const tip = arrowTip(from, r);
    const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
    const headLen = 30;
    const headHalf = 15;
    const baseX = tip.x - Math.cos(angle) * headLen;
    const baseY = tip.y - Math.sin(angle) * headLen;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(baseX, baseY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(baseX + Math.sin(angle) * headHalf, baseY - Math.cos(angle) * headHalf);
    ctx.lineTo(baseX - Math.sin(angle) * headHalf, baseY + Math.cos(angle) * headHalf);
    ctx.closePath();
    ctx.fill();
  }
}

/** Default arrow tail: below-left of the rectangle, kept inside the image. */
export const defaultArrowFrom = (rect: Hotspot["rect"]) => ({
  x: Math.max(0.02, Math.min(0.98, rect.x - 0.12)),
  y: Math.max(0.02, Math.min(0.98, rect.y + rect.h + 0.12)),
});

function drawHotspots(
  ctx: CanvasRenderingContext2D,
  hotspots: Hotspot[],
  t: number,
  fit: Box,
  layout: Layout,
  wordTimes: number[],
  durationS: number,
  st: Style
) {
  const visible = hotspots
    .map((h) => {
      const start = hotspotStartS(h, wordTimes);
      const end = hotspotEndS(h, durationS);
      if (t < start || t >= end) return null;
      const p = easeOut(Math.min(1, (t - start) / HOTSPOT_IN_S));
      return { h, p, r: scaleAbout(toFrame(fit, h.rect), 1.08 - 0.08 * p) };
    })
    .filter((v): v is { h: Hotspot; p: number; r: Box } => !!v);
  if (!visible.length) return;

  const spots = visible.filter((v) => v.h.spotlight);
  if (spots.length) drawSpotlight(ctx, spots.map((v) => v.r), Math.max(...spots.map((v) => v.p)), layout);

  const base = ctx.globalAlpha;
  visible.forEach(({ h, p, r }) => {
    ctx.save();
    ctx.globalAlpha = base * p;
    drawHotspotShape(ctx, h, r, fit);
    if (h.label?.trim()) drawLabel(ctx, h.label.trim(), r, layout.imageBox, st);
    ctx.restore();
  });
}

// ---------- scenes ----------

export interface FrameEnv {
  settings: Pick<VideoSettings, "captions" | "showSource">;
  wordTimes: number[];
  speechS: number;
  durationS: number;
  image?: SceneImage;
  imageLoading?: boolean;
  index: number;
  count: number;
  dataRelease?: string;
  branding: ExportBranding; // palette, fonts and the platform name in the footer
  hotspots?: Hotspot[]; // editor drafts; defaults to scene.hotspots
}

function drawFooter(ctx: CanvasRenderingContext2D, layout: Layout, env: FrameEnv) {
  const st = styleOf(env.branding);
  const f = layout.footer;
  ctx.save();
  ctx.font = font(st, 400, f.size);
  ctx.fillStyle = st.colors.muted;
  ctx.textBaseline = "alphabetic";
  const source = env.settings.showSource ? platformLabel(env.branding, env.dataRelease) : "";
  if (source) {
    ctx.textAlign = "left";
    ctx.fillText(ellipsize(ctx, source, f.right - f.left - 160), f.left, f.baseline);
  }
  ctx.textAlign = "right";
  ctx.fillText(`${env.index + 1} / ${env.count}`, f.right, f.baseline);
  ctx.restore();
}

function drawKicker(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  st: Style,
  color = st.colors.primary,
  align: CanvasTextAlign = "left"
) {
  ctx.font = font(st, 400, 30, true);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(ellipsize(ctx, text.toUpperCase(), w), x, y);
}

function drawFigureScene(ctx: CanvasRenderingContext2D, scene: VideoScene, t: number, layout: Layout, env: FrameEnv) {
  const st = styleOf(env.branding);
  const { kicker, title, imageBox } = layout;
  let y = kicker.y;
  if (scene.kicker) {
    drawKicker(ctx, scene.kicker, kicker.x, kicker.y, kicker.w, st);
    y = title.y;
  }
  ctx.font = font(st, 700, title.size);
  ctx.fillStyle = TITLE_COLOR;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  wrapLines(ctx, scene.title, title.w, title.maxLines).forEach((line, i) =>
    ctx.fillText(line, title.x, y + i * title.lineHeight)
  );

  if (env.image) {
    const fit = fitContain(env.image.width, env.image.height, imageBox);
    ctx.drawImage(env.image.source, fit.x, fit.y, fit.w, fit.h);
    drawHotspots(ctx, env.hotspots ?? scene.hotspots, t, fit, layout, env.wordTimes, env.durationS, st);
  } else {
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(imageBox.x, imageBox.y, imageBox.w, imageBox.h);
    ctx.font = font(st, 400, 32);
    ctx.fillStyle = st.colors.muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      env.imageLoading ? "Preparing figure…" : "Figure unavailable",
      imageBox.x + imageBox.w / 2,
      imageBox.y + imageBox.h / 2
    );
  }
}

/** Kicker, big text and an optional subtitle, centred vertically in the text box. */
function drawTextScene(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  st: Style,
  opts: { kicker?: string; kickerColor?: string; text: string; size: number; maxLines: number; subtitle?: string; subtitleColor?: string; accent?: string; center: boolean }
) {
  const box = layout.text;
  const lineH = Math.round(opts.size * 1.18);
  const accentW = opts.accent ? 14 : 0;
  const textX = opts.center ? box.x + box.w / 2 : box.x + accentW + (accentW ? 36 : 0);
  const textW = box.w - (opts.center ? 0 : accentW + (accentW ? 36 : 0));
  const align: CanvasTextAlign = opts.center ? "center" : "left";

  ctx.font = font(st, 700, opts.size);
  const lines = wrapLines(ctx, opts.text, textW, opts.maxLines);
  ctx.font = font(st, 500, layout.display.subtitle);
  const subLines = opts.subtitle ? wrapLines(ctx, opts.subtitle, textW, 3) : [];
  const subLineH = Math.round(layout.display.subtitle * 1.3);

  const kickerH = opts.kicker ? 30 + 36 : 0;
  const textH = lines.length * lineH;
  const subH = subLines.length ? 48 + subLines.length * subLineH : 0;
  let y = box.y + Math.max(0, (box.h - kickerH - textH - subH) / 2);

  if (opts.kicker) {
    drawKicker(ctx, opts.kicker, textX, y, textW, st, opts.kickerColor, align);
    y += kickerH;
  }
  if (opts.accent) {
    ctx.fillStyle = opts.accent;
    ctx.fillRect(box.x, y, accentW, textH);
  }
  ctx.font = font(st, 700, opts.size);
  ctx.fillStyle = TITLE_COLOR;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, textX, y + i * lineH));
  y += textH;
  if (subLines.length) {
    y += 48;
    ctx.font = font(st, 500, layout.display.subtitle);
    ctx.fillStyle = opts.subtitleColor ?? st.colors.muted;
    subLines.forEach((line, i) => ctx.fillText(line, textX, y + i * subLineH));
  }
}

/** Draws one scene at `tInScene` seconds. Pure apart from the canvas it draws on. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  scene: VideoScene,
  tInScene: number,
  layout: Layout,
  env: FrameEnv
): void {
  const st = styleOf(env.branding);
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (scene.kind === "figure") {
    drawFigureScene(ctx, scene, tInScene, layout, env);
  } else if (scene.kind === "statement") {
    drawTextScene(ctx, layout, st, {
      kicker: scene.kicker,
      kickerColor: scene.tone === "finding" ? st.colors.finding : st.colors.primary,
      text: scene.title,
      size: layout.display.statement,
      maxLines: layout.aspect === "9:16" ? 12 : 8,
      accent: scene.tone === "finding" ? st.colors.finding : st.colors.primary,
      center: false,
    });
  } else {
    drawTextScene(ctx, layout, st, {
      kicker: scene.kicker,
      text: scene.title,
      size: layout.display.title,
      maxLines: layout.aspect === "9:16" ? 6 : 4,
      subtitle: scene.subtitle,
      subtitleColor: scene.kind === "end" ? st.colors.primary : undefined,
      center: true,
    });
  }

  if (env.settings.captions.burnIn && scene.narration.trim()) {
    const cues = captionCues(ctx, scene.narration, env, layout, env.branding);
    const cue = cues.find((c) => tInScene >= c.start && tInScene < c.end);
    if (cue) drawCaptions(ctx, cue, layout, st);
  }
  drawFooter(ctx, layout, env);
  ctx.restore();
}

// ---------- timeline ----------

export interface TimelineEntry {
  scene: VideoScene;
  start: number;
  duration: number;
  timing: SceneTiming;
  image?: SceneImage;
  imageLoading?: boolean;
}

export interface Timeline {
  entries: TimelineEntry[];
  total: number;
}

export function buildTimeline(
  entries: Omit<TimelineEntry, "start">[]
): Timeline {
  let t = 0;
  const out = entries.map((e) => {
    const entry = { ...e, start: t };
    t += e.duration;
    return entry;
  });
  return { entries: out, total: t };
}

export const entryIndexAt = (timeline: Timeline, t: number): number => {
  const i = timeline.entries.findIndex((e) => t < e.start + e.duration);
  return i < 0 ? timeline.entries.length - 1 : i;
};

/** What every frame needs besides the timeline: the display settings, branding and release. */
export interface FrameSetup {
  settings: FrameEnv["settings"];
  branding: ExportBranding;
  dataRelease?: string;
}

export const frameEnv = (
  timeline: Timeline,
  index: number,
  { settings, branding, dataRelease }: FrameSetup,
  live?: { wordTimes: number[]; speechS: number }
): FrameEnv => {
  const e = timeline.entries[index];
  return {
    settings,
    branding,
    wordTimes: live?.wordTimes ?? e.timing.wordTimes,
    speechS: live?.speechS ?? e.timing.speechS,
    durationS: e.duration,
    image: e.image,
    imageLoading: e.imageLoading,
    index,
    count: timeline.entries.length,
    dataRelease,
  };
};

/** A still that shows the scene's point: just after its last hotspot appears, else at 1 s. */
export const posterTime = (entry: Pick<TimelineEntry, "scene" | "timing" | "duration">): number => {
  const starts = entry.scene.hotspots.map((h) => hotspotStartS(h, entry.timing.wordTimes));
  const t = starts.length ? Math.max(...starts) + HOTSPOT_IN_S + 0.1 : 1;
  return Math.max(0, Math.min(entry.duration - 0.05, t));
};

/** Sets a transform so frame coordinates fill the canvas, and returns the context. */
export function frameContext(canvas: HTMLCanvasElement, layout: Layout): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(canvas.width / layout.width, 0, 0, canvas.height / layout.height, 0, 0);
  return ctx;
}

/** Crossfade into a scene: draws the outgoing frame, then the incoming one fading in over 300 ms. */
export function drawCrossfade(
  ctx: CanvasRenderingContext2D,
  draw: { prev?: () => void; next: () => void },
  tInScene: number
) {
  if (!draw.prev || tInScene >= CROSSFADE_S) {
    draw.next();
    return;
  }
  draw.prev();
  ctx.save();
  ctx.globalAlpha = Math.max(0, tInScene / CROSSFADE_S);
  draw.next();
  ctx.restore();
}
