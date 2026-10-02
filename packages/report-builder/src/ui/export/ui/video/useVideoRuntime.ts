import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { styled } from "@mui/material/styles";
import { useReportConfig } from "../../../../react";
import { runtimeVideoWarnings } from "../../plan/video";
import type { ExportWarning, VideoScene, VideoSettings } from "../../types";
import { buildTimeline, type Timeline } from "../../video/compositor";
import { type SceneImage, sceneImage } from "../../video/images";
import {
  cacheTiming,
  effectiveVoice,
  englishVoices,
  loadVoices,
  type SceneTiming,
  sceneDuration,
  timingFor,
  ttsSupported,
} from "../../video/tts";

export interface VoicesState {
  supported: boolean; // speechSynthesis exists and has English voices
  loading: boolean;
  voices: SpeechSynthesisVoice[]; // English, local first
}

export function useVoices(): VoicesState {
  const [state, setState] = useState<VoicesState>(() => ({ supported: ttsSupported(), loading: ttsSupported(), voices: [] }));
  useEffect(() => {
    if (!ttsSupported()) return undefined;
    let cancelled = false;
    const update = (all: SpeechSynthesisVoice[]) => {
      if (cancelled) return;
      const voices = englishVoices(all);
      setState({ supported: voices.length > 0, loading: false, voices });
    };
    loadVoices().then(update);
    // Voices can arrive later (e.g. network voices in Chrome)
    const onChange = () => update(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    return () => {
      cancelled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
    };
  }, []);
  return state;
}

// Stable ids for asset objects, so effects can depend on "which assets" as a string
const objectIds = new WeakMap<object, number>();
let nextObjectId = 1;
const objectId = (o: object | undefined): number => {
  if (!o) return 0;
  let id = objectIds.get(o);
  if (!id) {
    id = nextObjectId++;
    objectIds.set(o, id);
  }
  return id;
};

/** Decoded figure images per scene id (undefined while loading or when there is none). */
export function useSceneImages(scenes: VideoScene[]) {
  const { branding } = useReportConfig();
  const [images, setImages] = useState<Record<string, SceneImage | undefined>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const scenesRef = useRef(scenes);
  scenesRef.current = scenes;
  // Re-run only when a figure's asset changes, not on every title/narration edit
  const assetKey = scenes
    .filter((s) => s.kind === "figure")
    .map((s) => `${s.sceneId}:${objectId(s.asset ?? s.table)}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;
    scenesRef.current
      .filter((s) => s.kind === "figure")
      .forEach((scene) => {
        setLoading((l) => (l[scene.sceneId] ? l : { ...l, [scene.sceneId]: true }));
        // sceneImage() caches per block and asset, so re-runs are cheap
        sceneImage(scene, branding).then((img) => {
          if (cancelled) return;
          setImages((m) => (m[scene.sceneId] === img ? m : { ...m, [scene.sceneId]: img }));
          setLoading((l) => ({ ...l, [scene.sceneId]: false }));
        });
      });
    return () => {
      cancelled = true;
    };
  }, [assetKey, branding]);

  return { images, loading };
}

/**
 * Timings, durations and the playable timeline (included scenes only) for the current voice.
 * Measured timings arrive from playback (`onMeasured`) and replace the estimates.
 */
export function useVideoTimeline(
  scenes: VideoScene[],
  settings: VideoSettings,
  voices: VoicesState,
  images: Record<string, SceneImage | undefined>,
  imagesLoading: Record<string, boolean>
) {
  const [timingVersion, setTimingVersion] = useState(0);
  const voice = useMemo(
    () => (voices.supported ? effectiveVoice(settings.voice, voices.voices) : null),
    [settings.voice, voices]
  );
  const timingVoice = useMemo(
    () => (voice ? { voiceURI: voice.voiceURI, rate: voice.rate } : null),
    [voice]
  );

  const { timings, durations } = useMemo(() => {
    const t: Record<string, SceneTiming> = {};
    const d: Record<string, number> = {};
    scenes.forEach((s) => {
      // Captions-only still paces captions with the chosen rate
      t[s.sceneId] = timingFor(s.narration, timingVoice ?? { rate: settings.voice.rate });
      d[s.sceneId] = sceneDuration(t[s.sceneId], s.minDurationS);
    });
    return { timings: t, durations: d };
    // timingVersion: a measured timing landed in the cache
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, timingVoice, settings.voice.rate, timingVersion]);

  const timeline: Timeline = useMemo(
    () =>
      buildTimeline(
        scenes
          .filter((s) => s.include)
          .map((scene) => ({
            scene,
            duration: durations[scene.sceneId],
            timing: timings[scene.sceneId],
            image: images[scene.sceneId],
            imageLoading: imagesLoading[scene.sceneId],
          }))
      ),
    [scenes, durations, timings, images, imagesLoading]
  );

  const onMeasured = useCallback(
    (_sceneId: string, narration: string, timing: SceneTiming) => {
      if (!voice) return;
      cacheTiming(narration, voice.voiceURI, voice.rate, timing);
      setTimingVersion((v) => v + 1);
    },
    [voice]
  );

  const imageHashes = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    Object.entries(images).forEach(([id, img]) => {
      out[id] = img?.hash;
    });
    return out;
  }, [images]);

  const runtimeWarnings: ExportWarning[] = useMemo(
    () => runtimeVideoWarnings(scenes, durations, imageHashes),
    [scenes, durations, imageHashes]
  );

  return {
    voice: voice ? { voice: voice.voice, rate: voice.rate } : null,
    timings,
    durations,
    timeline,
    onMeasured,
    imageHashes,
    runtimeWarnings,
  };
}

export const formatSeconds = (s: number): string => {
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};

/** Element size via a callback ref (works for content a portal mounts after the first render). */
export function useElementSize<T extends HTMLElement>() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    observer.current = new ResizeObserver(update);
    observer.current.observe(el);
  }, []);
  return [ref, size] as const;
}

/** A <canvas> that takes `sx` but keeps `width`/`height` as pixel attributes (Box would turn them into CSS). */
export const Canvas = styled("canvas")({});
