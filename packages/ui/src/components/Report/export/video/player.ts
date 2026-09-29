/**
 * Real-time playback of a timeline onto a canvas, with narration. Used by the storyboard preview
 * and by the recorder, so a recording plays exactly like the preview.
 *
 * Each scene runs on its own clock. When the voice reports word boundaries, word times are
 * re-synced live, and a scene is held until its speech ends (+0.6 s) so audio never spills
 * into the next scene. The log records what actually played (the .srt is built from it).
 */
import type { Hotspot } from "../types";
import {
  drawCrossfade,
  drawFrame,
  type FrameEnv,
  frameContext,
  frameEnv,
  type Layout,
  type Timeline,
} from "./compositor";
import { measuredTiming, type SceneTiming, speakNarration, type SpeakHandle, TAIL_S, tokenize } from "./tts";

export interface PlaybackLogEntry {
  sceneId: string;
  narration: string;
  startS: number; // from the start of the playback
  durationS: number;
  wordTimes: number[];
  speechS: number;
}

export interface PlaybackResult {
  completed: boolean;
  log: PlaybackLogEntry[];
  elapsedS: number;
}

export interface PlaybackHandle {
  stop: () => void;
  isSpeaking: () => boolean;
  done: Promise<PlaybackResult>;
}

export interface PlaybackOptions {
  canvas: HTMLCanvasElement;
  timeline: Timeline;
  layout: Layout;
  settings: FrameEnv["settings"];
  dataRelease?: string;
  fromIndex: number;
  toIndex: number; // inclusive
  startOffsetS?: number; // start the first scene part-way through (hotspot preview)
  voice: { voice: SpeechSynthesisVoice; rate: number } | null;
  hotspots?: Record<string, Hotspot[]>; // editor drafts by scene id
  onTime?: (t: number, index: number) => void; // t on the timeline
  onSceneStart?: (index: number) => void;
  onMeasured?: (sceneId: string, narration: string, timing: SceneTiming) => void;
  onFrame?: (deltaMs: number) => void;
}

// A voice that keeps talking far past the plan still ends the scene eventually
const MAX_OVERRUN_S = 10;

export function play(opts: PlaybackOptions): PlaybackHandle {
  const { canvas, timeline, layout, settings, dataRelease, voice } = opts;
  const log: PlaybackLogEntry[] = [];
  const t0 = performance.now();
  let stopped = false;
  let raf = 0;
  let lastFrame = t0;
  let resolveDone!: (r: PlaybackResult) => void;
  const done = new Promise<PlaybackResult>((r) => {
    resolveDone = r;
  });

  interface SceneState {
    index: number;
    wallStart: number;
    offset: number;
    live: { wordTimes: number[]; speechS: number };
    speechAt: number;
    fromWord: number;
    speech?: SpeakHandle;
    speechStartT?: number;
    speechEndT?: number;
    speechDone: boolean;
    startedAtS: number;
  }

  let cur: SceneState;
  let prev: { index: number; t: number; live: SceneState["live"] } | undefined;

  const tIn = (s: SceneState, now: number) => s.offset + (now - s.wallStart) / 1000;

  const startScene = (index: number, offset: number, now: number) => {
    const entry = timeline.entries[index];
    const live = { wordTimes: entry.timing.wordTimes.slice(), speechS: entry.timing.speechS };
    const words = tokenize(entry.scene.narration);
    let fromWord = 0;
    if (offset > 0) {
      fromWord = live.wordTimes.findIndex((w) => w >= offset);
      if (fromWord < 0) fromWord = words.length;
    }
    cur = {
      index,
      wallStart: now,
      offset,
      live,
      fromWord,
      speechAt: fromWord > 0 ? live.wordTimes[fromWord] ?? 0 : 0,
      speechDone: !voice || fromWord >= words.length,
      startedAtS: (now - t0) / 1000,
    };
    opts.onSceneStart?.(index);
  };

  const startSpeech = (s: SceneState) => {
    if (!voice) return;
    const entry = timeline.entries[s.index];
    const now = () => tIn(s, performance.now());
    s.speech = speakNarration(entry.scene.narration, {
      voice: voice.voice,
      rate: voice.rate,
      fromWord: s.fromWord,
      onStart: () => {
        s.speechStartT = now();
      },
      onWord: (i, elapsed) => {
        // Re-sync this word and everything after it to what the voice is actually doing
        const actual = (s.speechStartT ?? s.speechAt) + elapsed;
        const delta = actual - s.live.wordTimes[i];
        if (!Number.isFinite(delta)) return;
        for (let j = i; j < s.live.wordTimes.length; j += 1) s.live.wordTimes[j] += delta;
        s.live.speechS += delta;
      },
      onEnd: (elapsed) => {
        s.speechEndT = (s.speechStartT ?? s.speechAt) + elapsed;
        s.live.speechS = s.speechEndT;
      },
    });
    s.speech.done.then((result) => {
      s.speechDone = true;
      if (result.completed && s.fromWord === 0) {
        const measured = measuredTiming(result.times, result.speechS, result.boundaries);
        if (measured) opts.onMeasured?.(entry.scene.sceneId, entry.scene.narration, measured);
      }
    });
  };

  const speaking = () => !!cur?.speech && !cur.speechDone;

  const finish = (completed: boolean) => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    cur?.speech?.cancel();
    resolveDone({ completed, log, elapsedS: (performance.now() - t0) / 1000 });
  };

  const sceneEnd = (s: SceneState): number => {
    const entry = timeline.entries[s.index];
    return Math.max(entry.duration, s.speechEndT !== undefined ? s.speechEndT + TAIL_S : 0);
  };

  const draw = (s: SceneState, t: number) => {
    const ctx = frameContext(canvas, layout);
    if (!ctx) return;
    const envFor = (index: number, live: SceneState["live"]) => {
      const env = frameEnv(timeline, index, settings, dataRelease, live);
      const drafts = opts.hotspots?.[timeline.entries[index].scene.sceneId];
      return drafts ? { ...env, hotspots: drafts } : env;
    };
    const p = prev;
    drawCrossfade(
      ctx,
      {
        prev: p
          ? () => drawFrame(ctx, timeline.entries[p.index].scene, p.t, layout, envFor(p.index, p.live))
          : undefined,
        next: () => drawFrame(ctx, timeline.entries[s.index].scene, t, layout, envFor(s.index, s.live)),
      },
      t
    );
  };

  const frame = (now: number) => {
    if (stopped) return;
    opts.onFrame?.(now - lastFrame);
    lastFrame = now;
    const s = cur;
    const entry = timeline.entries[s.index];
    let t = tIn(s, now);

    if (!s.speech && !s.speechDone && t >= s.speechAt) startSpeech(s);

    const overrun = t > entry.duration + MAX_OVERRUN_S;
    if (t >= sceneEnd(s) && (!speaking() || overrun)) {
      if (overrun) s.speech?.cancel();
      const end = sceneEnd(s);
      log.push({
        sceneId: entry.scene.sceneId,
        narration: entry.scene.narration,
        startS: s.startedAtS,
        durationS: end - s.offset,
        wordTimes: s.live.wordTimes.slice(),
        speechS: s.live.speechS,
      });
      if (s.index >= opts.toIndex) {
        draw(s, Math.min(t, end));
        finish(true);
        return;
      }
      prev = { index: s.index, t: end, live: s.live };
      startScene(s.index + 1, 0, now);
      t = 0;
    }
    draw(cur, t);
    opts.onTime?.(timeline.entries[cur.index].start + Math.min(t, timeline.entries[cur.index].duration), cur.index);
    raf = requestAnimationFrame(frame);
  };

  if (!timeline.entries.length || opts.fromIndex > opts.toIndex) {
    resolveDone({ completed: true, log, elapsedS: 0 });
    return { stop: () => {}, isSpeaking: () => false, done };
  }
  startScene(opts.fromIndex, Math.max(0, opts.startOffsetS ?? 0), t0);
  raf = requestAnimationFrame(frame);

  return { stop: () => finish(false), isSpeaking: speaking, done };
}

/** Draws a still of one scene (no playback). */
export function drawStill(
  canvas: HTMLCanvasElement,
  timeline: Timeline,
  index: number,
  t: number,
  layout: Layout,
  settings: FrameEnv["settings"],
  dataRelease?: string,
  hotspots?: Hotspot[]
): void {
  const ctx = frameContext(canvas, layout);
  const entry = timeline.entries[index];
  if (!ctx || !entry) return;
  const env = frameEnv(timeline, index, settings, dataRelease);
  drawFrame(ctx, entry.scene, t, layout, hotspots ? { ...env, hotspots } : env);
}
