/**
 * Recording (spec §8): the canvas plays the video in real time while MediaRecorder records
 * `canvas.captureStream(30)` plus, for narrated videos, this tab's audio from getDisplayMedia.
 */
import type { VideoAspect } from "../types";
import { play, type PlaybackLogEntry, type PlaybackOptions } from "./player";

export const VIDEO_TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

const canRecord = () => typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function";

export const pickMimeType = (): string | undefined =>
  canRecord() ? VIDEO_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) : undefined;

export const mp4Supported = (): boolean =>
  canRecord() && VIDEO_TYPES.some((t) => t.startsWith("video/mp4") && MediaRecorder.isTypeSupported(t));

export const extensionFor = (mimeType: string | undefined): "mp4" | "webm" =>
  mimeType?.startsWith("video/mp4") ? "mp4" : "webm";

/** Tab audio capture exists in Chromium browsers only (Chrome, Edge). */
export const tabAudioSupported = (): boolean => {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  return !!brands?.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
};

export class NoTabAudioError extends Error {
  constructor() {
    super("No tab audio was shared. Pick this tab and tick “Share tab audio”.");
    this.name = "NoTabAudioError";
  }
}

/** Asks to share this tab with its audio; keeps only the audio track. */
export async function captureTabAudio(): Promise<MediaStreamTrack> {
  const options = {
    video: true,
    audio: true,
    preferCurrentTab: true,
    selfBrowserSurface: "include",
    systemAudio: "include",
  } as DisplayMediaStreamOptions;
  const stream = await navigator.mediaDevices.getDisplayMedia(options);
  stream.getVideoTracks().forEach((t) => t.stop());
  const [audio] = stream.getAudioTracks();
  if (!audio) throw new NoTabAudioError();
  return audio;
}

/** `{report-slug}-video-{9x16}-{YYYY-MM-DD}.{ext}` */
export function videoFileName(reportName: string, aspect: VideoAspect, ext: string, date = new Date()): string {
  const slug =
    reportName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "report";
  return `${slug}-video-${aspect.replace(":", "x")}-${date.toISOString().slice(0, 10)}.${ext}`;
}

export type RecordWarning = "SILENT_AUDIO" | "CHOPPY";

export interface RecordResult {
  status: "done" | "cancelled" | "hidden";
  blob?: Blob;
  mimeType?: string;
  log: PlaybackLogEntry[];
  warnings: RecordWarning[];
}

export interface RecordHandle {
  cancel: () => void;
  done: Promise<RecordResult>;
}

const SILENT_RMS = 0.004;
const SILENT_AFTER_S = 2;
const SLOW_FRAME_MS = 50;

export function recordVideo(
  opts: Omit<PlaybackOptions, "fromIndex" | "toIndex" | "onFrame"> & {
    audioTrack?: MediaStreamTrack;
    onWarning?: (w: RecordWarning) => void;
  }
): RecordHandle {
  const { canvas, timeline, audioTrack } = opts;
  const mimeType = pickMimeType();
  if (!mimeType) {
    return {
      cancel: () => {},
      done: Promise.reject(new Error("This browser can't record video (MediaRecorder is unavailable).")),
    };
  }

  const type = mimeType.split(";")[0];
  const canvasStream = canvas.captureStream(30);
  const stream = new MediaStream([...canvasStream.getVideoTracks(), ...(audioTrack ? [audioTrack] : [])]);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  const warnings: RecordWarning[] = [];
  const warn = (w: RecordWarning) => {
    if (warnings.includes(w)) return;
    warnings.push(w);
    opts.onWarning?.(w);
  };

  // ---- silent-audio check on the first narrated scene ----
  let audioCtx: AudioContext | undefined;
  let analyser: AnalyserNode | undefined;
  const firstNarrated = timeline.entries.findIndex((e) => e.scene.narration.trim());
  if (audioTrack && opts.voice && firstNarrated >= 0) {
    try {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
    } catch {
      analyser = undefined;
    }
  }
  const samples = new Float32Array(2048);
  let heard = false;
  let silentS = 0;
  let sceneIndex = 0;

  // ---- frame pacing ----
  let frames = 0;
  let slowFrames = 0;

  let status: RecordResult["status"] = "done";
  let playback: ReturnType<typeof play> | undefined;

  const onVisibility = () => {
    if (document.visibilityState !== "hidden") return;
    status = "hidden";
    playback?.stop();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const done = (async (): Promise<RecordResult> => {
    recorder.start(1000);
    // Let the recorder see a first frame before the clock starts
    await new Promise((r) => setTimeout(r, 100));
    const cancelledEarly = { completed: false, log: [] as PlaybackLogEntry[], elapsedS: 0 };
    if (status !== "done") return finishRecording(cancelledEarly);
    playback = play({
      ...opts,
      fromIndex: 0,
      toIndex: timeline.entries.length - 1,
      onSceneStart: (i) => {
        sceneIndex = i;
        opts.onSceneStart?.(i);
      },
      onFrame: (delta) => {
        frames += 1;
        if (delta > SLOW_FRAME_MS) slowFrames += 1;
        if (!analyser || heard || sceneIndex !== firstNarrated || !playback?.isSpeaking()) return;
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
        const rms = Math.sqrt(sum / samples.length);
        if (rms > SILENT_RMS) heard = true;
        else {
          silentS += delta / 1000;
          if (silentS >= SILENT_AFTER_S) warn("SILENT_AUDIO");
        }
      },
    });
    return finishRecording(await playback.done);
  })();

  async function finishRecording(result: { completed: boolean; log: PlaybackLogEntry[] }): Promise<RecordResult> {
    if (!result.completed && status === "done") status = "cancelled";
    // Hold the last frame briefly so it lands in the file
    if (status === "done") await new Promise((r) => setTimeout(r, 250));
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    document.removeEventListener("visibilitychange", onVisibility);
    canvasStream.getTracks().forEach((t) => t.stop());
    audioTrack?.stop();
    audioCtx?.close().catch(() => undefined);
    if (frames > 10 && slowFrames / frames > 0.1) warn("CHOPPY");
    return {
      status,
      blob: status === "done" ? new Blob(chunks, { type }) : undefined,
      mimeType,
      log: result.log,
      warnings,
    };
  }

  return {
    cancel: () => {
      status = "cancelled";
      playback?.stop();
    },
    done,
  };
}
