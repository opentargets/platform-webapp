import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import type { Hotspot, VideoSettings } from "../../types";
import { ensureFonts, FRAME_SIZE, type Layout, posterTime, type Timeline } from "../../video/compositor";
import { drawStill, play, type PlaybackHandle } from "../../video/player";
import type { SceneTiming } from "../../video/tts";
import { Canvas, formatSeconds } from "./useVideoRuntime";

export interface PreviewHandle {
  playScene: (index: number, offsetS?: number) => void;
  playAll: () => void;
  stop: () => void;
}

interface ScenePreviewCanvasProps {
  timeline: Timeline;
  layout: Layout;
  settings: Pick<VideoSettings, "captions" | "showSource">;
  dataRelease?: string;
  index: number; // scene shown when not playing
  stillTime?: number; // defaults to the scene's poster time
  maxWidth: number;
  maxHeight: number;
  voice: { voice: SpeechSynthesisVoice; rate: number } | null;
  hotspots?: Record<string, Hotspot[]>; // editor drafts
  controls?: boolean;
  onMeasured?: (sceneId: string, narration: string, timing: SceneTiming) => void;
  onTime?: (t: number | null, index: number) => void; // null when playback stops
  onPlayingChange?: (playing: boolean) => void;
}

const TIME_UPDATE_MS = 100;

/** The compositor on a canvas scaled to fit, with Play scene / Play all. */
export const ScenePreviewCanvas = forwardRef<PreviewHandle, ScenePreviewCanvasProps>(function ScenePreviewCanvas(
  {
    timeline,
    layout,
    settings,
    dataRelease,
    index,
    stillTime,
    maxWidth,
    maxHeight,
    voice,
    hotspots,
    controls = true,
    onMeasured,
    onTime,
    onPlayingChange,
  },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playbackRef = useRef<PlaybackHandle | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState<number | null>(null);
  const [fontsReady, setFontsReady] = useState(false);

  const frame = FRAME_SIZE[layout.aspect];
  const scale = Math.min(maxWidth / frame.width, maxHeight / frame.height);
  const cssW = Math.max(40, Math.floor(frame.width * scale));
  const cssH = Math.max(40, Math.floor(frame.height * scale));
  const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const pxW = Math.min(frame.width, Math.round(cssW * dpr));
  const pxH = Math.min(frame.height, Math.round(cssH * dpr));

  useEffect(() => {
    let cancelled = false;
    ensureFonts().then(() => !cancelled && setFontsReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Latest props for the playback callbacks
  const latest = useRef({ onMeasured, onTime, onPlayingChange });
  latest.current = { onMeasured, onTime, onPlayingChange };

  const stop = useCallback(() => {
    playbackRef.current?.stop();
  }, []);

  const start = useCallback(
    (from: number, to: number, offsetS = 0) => {
      const canvas = canvasRef.current;
      if (!canvas || !timeline.entries.length) return;
      playbackRef.current?.stop();
      let lastTimeUpdate = 0;
      const handle = play({
        canvas,
        timeline,
        layout,
        settings,
        dataRelease,
        fromIndex: from,
        toIndex: to,
        startOffsetS: offsetS,
        voice,
        hotspots,
        onMeasured: (...args) => latest.current.onMeasured?.(...args),
        onTime: (t, i) => {
          const now = performance.now();
          if (now - lastTimeUpdate < TIME_UPDATE_MS) return;
          lastTimeUpdate = now;
          setTime(t);
          latest.current.onTime?.(t, i);
        },
      });
      playbackRef.current = handle;
      setPlaying(true);
      latest.current.onPlayingChange?.(true);
      handle.done.then(() => {
        if (playbackRef.current !== handle) return;
        playbackRef.current = null;
        setPlaying(false);
        setTime(null);
        latest.current.onTime?.(null, from);
        latest.current.onPlayingChange?.(false);
      });
    },
    [timeline, layout, settings, dataRelease, voice, hotspots]
  );

  useImperativeHandle(
    ref,
    () => ({
      playScene: (i: number, offsetS?: number) => start(i, i, offsetS),
      playAll: () => start(0, timeline.entries.length - 1),
      stop,
    }),
    [start, stop, timeline.entries.length]
  );

  // Stop on unmount
  useEffect(() => () => playbackRef.current?.stop(), []);

  // Still frame when not playing
  const safeIndex = Math.max(0, Math.min(index, timeline.entries.length - 1));
  const entry = timeline.entries[safeIndex];
  const still = entry ? stillTime ?? posterTime(entry) : 0;
  const drafts = entry ? hotspots?.[entry.scene.sceneId] : undefined;
  useEffect(() => {
    if (playing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    if (!entry) {
      const ctx = canvas.getContext("2d");
      ctx?.setTransform(1, 0, 0, 1, 0, 0);
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    drawStill(canvas, timeline, safeIndex, still, layout, settings, dataRelease, drafts);
  }, [playing, timeline, safeIndex, still, layout, settings, dataRelease, drafts, entry, fontsReady, pxW, pxH]);

  const total = timeline.total;
  const shownTime = time ?? (entry ? entry.start + still : 0);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <Canvas
        ref={canvasRef}
        width={pxW}
        height={pxH}
        aria-label={entry ? `Preview of scene ${safeIndex + 1}: ${entry.scene.title}` : "Video preview"}
        role="img"
        sx={{ width: cssW, height: cssH, bgcolor: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)", display: "block" }}
      />
      {controls && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", justifyContent: "center" }}>
          {playing ? (
            <Button size="small" variant="outlined" onClick={stop} startIcon={<FontAwesomeIcon icon={faStop} />} sx={{ textTransform: "none" }}>
              Stop
            </Button>
          ) : (
            <>
              <Button
                size="small"
                variant="contained"
                disabled={!entry}
                onClick={() => start(safeIndex, safeIndex)}
                startIcon={<FontAwesomeIcon icon={faPlay} />}
                sx={{ textTransform: "none" }}
              >
                Play scene
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={!entry}
                onClick={() => start(0, timeline.entries.length - 1)}
                sx={{ textTransform: "none" }}
              >
                Play all
              </Button>
            </>
          )}
          <Typography sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, color: "text.secondary", minWidth: 110 }}>
            {formatSeconds(shownTime)} / {formatSeconds(total)}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

export default ScenePreviewCanvas;
