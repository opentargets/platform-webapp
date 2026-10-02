/**
 * Captions file (spec §8.4), built from the same cues as the burned-in captions and the
 * scene start / word times that were actually recorded, so both agree.
 */
import type { ExportBranding } from "../../../core";
import { captionCues, type Layout, measuringContext } from "./compositor";
import type { PlaybackLogEntry } from "./player";

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

/** 83.456 → "00:01:23,456" */
export const srtTime = (seconds: number): string => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms % 1000, 3)}`;
};

export function buildSrt(log: PlaybackLogEntry[], layout: Layout, branding: ExportBranding): string {
  const ctx = measuringContext();
  const blocks: string[] = [];
  log.forEach((entry) => {
    if (!entry.narration.trim()) return;
    captionCues(ctx, entry.narration, entry, layout, branding).forEach((cue) => {
      const end = Math.min(cue.end, entry.durationS);
      if (end <= cue.start) return;
      blocks.push(
        `${blocks.length + 1}\n${srtTime(entry.startS + cue.start)} --> ${srtTime(entry.startS + end)}\n${cue.lines.join("\n")}`
      );
    });
  });
  return blocks.length ? `${blocks.join("\n\n")}\n` : "";
}
