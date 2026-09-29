/**
 * Narration with the browser's speech synthesis: voices, speaking with word-boundary timing,
 * and the estimated timing used when a voice fires no boundary events (spec §7).
 */
import type { VideoVoiceSettings } from "../types";

// ---------- words ----------

export interface Word {
  text: string;
  start: number; // char offset in the narration
  end: number;
}

/** Words as the hotspot `start.index` and the captions count them: runs of non-space characters. */
export const tokenize = (narration: string): Word[] => {
  const out: Word[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(narration))) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return out;
};

export const endsSentence = (word: string): boolean => /[.!?…]["'”’)\]]*$/.test(word);

/** Word ranges [from, to) of each sentence. */
export const sentenceRanges = (words: Word[]): [number, number][] => {
  const out: [number, number][] = [];
  let from = 0;
  words.forEach((w, i) => {
    if (endsSentence(w.text) || i === words.length - 1) {
      out.push([from, i + 1]);
      from = i + 1;
    }
  });
  return out;
};

/** Index of the word containing (or starting after) a char offset. */
export const wordAtChar = (words: Word[], charIndex: number): number => {
  let lo = 0;
  let hi = words.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid].start <= charIndex) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found >= 0 && charIndex < words[found].end) return found;
  return Math.min(found + 1, words.length - 1);
};

// ---------- timing ----------

export type TimingMethod = "measured" | "estimated";

export interface SceneTiming {
  wordTimes: number[]; // seconds from the start of the narration, one per word
  speechS: number; // narration length
  method: TimingMethod;
}

export const SECONDS_PER_WORD = 0.37;
export const SENTENCE_PAUSE_S = 0.25;
export const TAIL_S = 0.6;

/** Fallback timing: words × 0.37 s / rate, spread by word length, +250 ms after . ? ! */
export function estimateTiming(narration: string, rate: number): SceneTiming {
  const words = tokenize(narration);
  if (!words.length) return { wordTimes: [], speechS: 0, method: "estimated" };
  const total = (words.length * SECONDS_PER_WORD) / (rate || 1);
  const weights = words.map((w) => Math.max(1, w.text.replace(/[\W_]/g, "").length));
  const sum = weights.reduce((a, b) => a + b, 0);
  const wordTimes: number[] = [];
  let t = 0;
  words.forEach((w, i) => {
    wordTimes.push(t);
    t += (total * weights[i]) / sum;
    if (i < words.length - 1 && endsSentence(w.text)) t += SENTENCE_PAUSE_S;
  });
  return { wordTimes, speechS: t, method: "estimated" };
}

/** Scene length: max(minDurationS, narration + 0.6 s). */
export const sceneDuration = (timing: SceneTiming, minDurationS: number): number =>
  Math.max(minDurationS, timing.speechS > 0 ? timing.speechS + TAIL_S : 0);

/**
 * Measured timings from a spoken run. Words the voice skipped (numbers, symbols) are
 * interpolated between their neighbours; no boundaries at all means the voice doesn't report them.
 */
export function measuredTiming(
  times: (number | undefined)[],
  speechS: number,
  boundaries: number
): SceneTiming | undefined {
  if (!boundaries || !times.length) return undefined;
  const out = times.slice();
  const known = out.map((t, i) => (t === undefined ? -1 : i)).filter((i) => i >= 0);
  if (!known.length) return undefined;
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] !== undefined) continue;
    const prev = [...known].reverse().find((k) => k < i);
    const next = known.find((k) => k > i);
    const t0 = prev !== undefined ? out[prev]! : 0;
    const t1 = next !== undefined ? out[next]! : speechS;
    const i0 = prev ?? -1;
    const i1 = next ?? out.length;
    out[i] = t0 + ((t1 - t0) * (i - i0)) / (i1 - i0);
  }
  // Keep them monotonic
  for (let i = 1; i < out.length; i += 1) out[i] = Math.max(out[i]!, out[i - 1]!);
  return { wordTimes: out as number[], speechS: Math.max(speechS, out[out.length - 1] ?? 0), method: "measured" };
}

// Measured timings for this page session, keyed by (narration, voice, rate)
const timingCache = new Map<string, SceneTiming>();
const cacheKey = (narration: string, voiceURI: string | undefined, rate: number) =>
  `${voiceURI ?? ""}\u0000${rate}\u0000${narration}`;

export const cacheTiming = (narration: string, voiceURI: string | undefined, rate: number, timing: SceneTiming) =>
  timingCache.set(cacheKey(narration, voiceURI, rate), timing);

/** Measured timing for this voice when a scene was played, else the estimate. */
export function timingFor(narration: string, voice: { voiceURI?: string; rate: number } | null): SceneTiming {
  const rate = voice?.rate ?? 1;
  if (voice) {
    const cached = timingCache.get(cacheKey(narration, voice.voiceURI, rate));
    if (cached) return cached;
  }
  return estimateTiming(narration, rate);
}

// ---------- voices ----------

export const ttsSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/** getVoices() fills in asynchronously: wait for voiceschanged or 1 s. */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const now = window.speechSynthesis.getVoices();
  if (now.length) return Promise.resolve(now);
  voicesPromise ??= new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const finish = () => {
      synth.removeEventListener("voiceschanged", finish);
      clearTimeout(timer);
      const voices = synth.getVoices();
      // Try again next time if nothing came back
      if (!voices.length) voicesPromise = null;
      resolve(voices);
    };
    const timer = setTimeout(finish, 1000);
    synth.addEventListener("voiceschanged", finish);
  });
  return voicesPromise;
}

/** English voices, local ones first. */
export const englishVoices = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] =>
  voices
    .filter((v) => v.lang.toLowerCase().startsWith("en"))
    .sort((a, b) => Number(b.localService) - Number(a.localService));

/** The chosen voice, else the first local en-* voice, else the first English one. */
export const resolveVoice = (
  voices: SpeechSynthesisVoice[],
  voiceURI?: string
): SpeechSynthesisVoice | undefined =>
  voices.find((v) => v.voiceURI === voiceURI) ?? voices.find((v) => v.localService) ?? voices[0];

/** Voice settings as timing keys see them (no voice = captions only). */
export const effectiveVoice = (
  settings: VideoVoiceSettings,
  voices: SpeechSynthesisVoice[]
): { voice: SpeechSynthesisVoice; voiceURI: string; rate: number } | null => {
  if (settings.mode !== "tts") return null;
  const voice = resolveVoice(voices, settings.voiceURI);
  return voice ? { voice, voiceURI: voice.voiceURI, rate: settings.rate } : null;
};

// ---------- speaking ----------

export interface SpeakResult {
  times: (number | undefined)[]; // elapsed seconds from speech start, per word (undefined = no boundary)
  speechS: number;
  boundaries: number;
  completed: boolean; // false when cancelled, errored or it never started
}

export interface SpeakHandle {
  done: Promise<SpeakResult>;
  cancel: () => void;
}

// Chrome drops events of utterances that get garbage-collected mid-speech; keep them referenced
const liveUtterances = new Set<SpeechSynthesisUtterance>();

/**
 * Speaks the narration from `fromWord`, one utterance per sentence (Chrome cuts long utterances
 * off after ~15 s). `onWord` gets each word's index and its elapsed time since speech started.
 */
export function speakNarration(
  narration: string,
  opts: {
    voice: SpeechSynthesisVoice;
    rate: number;
    fromWord?: number;
    onStart?: () => void;
    onWord?: (index: number, elapsedS: number) => void;
    onEnd?: (elapsedS: number) => void;
  }
): SpeakHandle {
  const words = tokenize(narration);
  const from = Math.max(0, Math.min(opts.fromWord ?? 0, words.length));
  const times: (number | undefined)[] = words.map(() => undefined);
  const synth = window.speechSynthesis;
  let startedAt: number | undefined;
  let boundaries = 0;
  let cancelled = false;
  let resolveDone!: (r: SpeakResult) => void;
  const done = new Promise<SpeakResult>((resolve) => {
    resolveDone = resolve;
  });
  const elapsed = () => (startedAt === undefined ? 0 : (performance.now() - startedAt) / 1000);

  const utterances: SpeechSynthesisUtterance[] = [];
  let finished = false;
  const finish = (completed: boolean) => {
    if (finished) return;
    finished = true;
    clearTimeout(startTimer);
    utterances.forEach((u) => liveUtterances.delete(u));
    const speechS = elapsed();
    if (completed) opts.onEnd?.(speechS);
    resolveDone({ times, speechS, boundaries, completed: completed && !cancelled });
  };

  const ranges = sentenceRanges(words).filter(([, to]) => to > from).map(([a, b]) => [Math.max(a, from), b]);
  if (!ranges.length) {
    resolveDone({ times, speechS: 0, boundaries: 0, completed: true });
    return { done, cancel: () => {} };
  }

  ranges.forEach(([a, b], i) => {
    const offset = words[a].start;
    const u = new SpeechSynthesisUtterance(narration.slice(offset, words[b - 1].end));
    u.voice = opts.voice;
    u.lang = opts.voice.lang;
    u.rate = opts.rate;
    u.onstart = () => {
      if (startedAt !== undefined) return;
      startedAt = performance.now();
      clearTimeout(startTimer);
      opts.onStart?.();
    };
    u.onboundary = (e) => {
      // Safari leaves name empty on word boundaries
      if (e.name && e.name !== "word") return;
      const index = wordAtChar(words, offset + e.charIndex);
      if (index < a || index >= b || times[index] !== undefined) return;
      boundaries += 1;
      times[index] = elapsed();
      opts.onWord?.(index, times[index]!);
    };
    const last = i === ranges.length - 1;
    u.onend = () => {
      if (last) finish(true);
    };
    // Includes "interrupted"/"canceled" from cancel() or another speak()
    u.onerror = () => finish(false);
    utterances.push(u);
    liveUtterances.add(u);
  });

  // Some engines never start (no audio device, voice not installed): give up after 4 s
  const startTimer = setTimeout(() => {
    if (startedAt === undefined) {
      synth.cancel();
      finish(false);
    }
  }, 4000);

  synth.cancel();
  utterances.forEach((u) => synth.speak(u));

  return {
    done,
    cancel: () => {
      if (finished) return;
      cancelled = true;
      synth.cancel();
      finish(false);
    },
  };
}
