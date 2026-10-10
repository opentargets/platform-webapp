import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  LinearProgress,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircle, faCircleCheck, faDownload } from "@fortawesome/free-solid-svg-icons";
import { useReportConfig } from "../../../../react";
import type { DeepPartial, VideoAspect, VideoPlan, VideoSettings } from "../../types";
import { ensureFonts, FRAME_SIZE, layoutFor, posterTime } from "../../video/compositor";
import { drawStill } from "../../video/player";
import {
  captureTabAudio,
  extensionFor,
  NoTabAudioError,
  pickMimeType,
  type RecordHandle,
  type RecordWarning,
  recordVideo,
  tabAudioSupported,
  videoFileName,
} from "../../video/recorder";
import { buildSrt } from "../../video/srt";
import { formatBytes } from "../nodeMeta";
import { monoLabelSx } from "../SlidesMappingStep";
import { ScenePreviewCanvas } from "./ScenePreviewCanvas";
import { VoiceControls } from "./ScenePanel";
import { Canvas, formatSeconds, useElementSize, useSceneImages, useVideoTimeline, useVoices } from "./useVideoRuntime";

type RecState =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "recording"; t: number; scene: number }
  | { kind: "done"; video: { blob: Blob; fileName: string; url: string }; srt?: { blob: Blob; fileName: string; url: string }; audio: boolean }
  | { kind: "hidden" }
  | { kind: "noAudio"; message: string }
  | { kind: "error"; message: string };

const WARNING_TEXT: Record<RecordWarning, string> = {
  SILENT_AUDIO:
    "The recording seems silent: this voice may play through the system speech engine rather than the tab. Try a “Google …” voice, or record with captions only.",
  CHOPPY: "The recording may be choppy. Close other tabs and try again.",
};

const download = (url: string, fileName: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const AspectThumb: React.FC<{
  aspect: VideoAspect;
  selected: boolean;
  onSelect: () => void;
  draw: (canvas: HTMLCanvasElement, aspect: VideoAspect) => void;
  disabled: boolean;
}> = ({ aspect, selected, onSelect, draw, disabled }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const size = FRAME_SIZE[aspect];
  const h = 110;
  const w = Math.round((size.width / size.height) * h);
  useEffect(() => {
    if (ref.current) draw(ref.current, aspect);
  }, [draw, aspect]);
  return (
    <Box
      role="radio"
      aria-checked={selected}
      aria-label={aspect}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onSelect()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
      sx={{ cursor: disabled ? "default" : "pointer", textAlign: "center", opacity: disabled && !selected ? 0.5 : 1 }}
    >
      <Canvas
        ref={ref}
        width={w * 2}
        height={h * 2}
        sx={{ width: w, height: h, display: "block", bgcolor: "#fff", outline: "2px solid", outlineColor: selected ? "primary.main" : "grey.300", outlineOffset: 2 }}
      />
      <Typography sx={{ fontSize: 12, fontFamily: "'Roboto Mono', monospace", mt: 0.75, fontWeight: selected ? 700 : 400 }}>{aspect}</Typography>
    </Box>
  );
};

interface VideoRenderStepProps {
  reportName: string;
  plan: VideoPlan;
  settings: VideoSettings;
  dataRelease?: string;
  updateVideo: (patch: DeepPartial<VideoSettings>) => void;
  onBusyChange?: (busy: boolean) => void;
}

export const VideoRenderStep: React.FC<VideoRenderStepProps> = ({ reportName, plan, settings, dataRelease, updateVideo, onBusyChange }) => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const voices = useVoices();
  const { images, loading } = useSceneImages(plan.scenes);
  const runtime = useVideoTimeline(plan.scenes, settings, voices, images, loading);
  const { branding } = useReportConfig();
  const layout = useMemo(() => layoutFor(settings.aspect), [settings.aspect]);
  const [state, setState] = useState<RecState>({ kind: "idle" });
  const [warnings, setWarnings] = useState<RecordWarning[]>([]);
  const recordCanvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<RecordHandle | null>(null);
  const urlsRef = useRef<string[]>([]);
  const [stageRef, stage] = useElementSize<HTMLDivElement>();

  const mimeType = useMemo(() => pickMimeType(), []);
  const canCaptureAudio = useMemo(() => tabAudioSupported(), []);
  const ttsOn = settings.voice.mode === "tts" && !!runtime.voice;
  const recordAudio = ttsOn && canCaptureAudio;
  const busy = state.kind === "preparing" || state.kind === "recording";
  const { timeline } = runtime;
  const allImagesReady = timeline.entries.every((e) => !e.imageLoading);

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  // Free object URLs and stop a recording when the step closes
  useEffect(
    () => () => {
      handleRef.current?.cancel();
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    },
    []
  );

  // The first figure scene shows the aspect best
  const thumbIndex = Math.max(0, timeline.entries.findIndex((e) => e.scene.kind === "figure"));
  const drawThumb = useCallback(
    (canvas: HTMLCanvasElement, aspect: VideoAspect) => {
      const entry = timeline.entries[thumbIndex];
      if (!entry) return;
      ensureFonts(branding).then(() =>
        drawStill(canvas, timeline, thumbIndex, posterTime(entry), layoutFor(aspect), { settings, branding, dataRelease })
      );
    },
    [timeline, thumbIndex, settings, branding, dataRelease]
  );

  const record = async (withAudio: boolean) => {
    setWarnings([]);
    setState({ kind: "preparing" });
    let audioTrack: MediaStreamTrack | undefined;
    if (withAudio) {
      try {
        audioTrack = await captureTabAudio();
      } catch (e) {
        const message =
          e instanceof NoTabAudioError
            ? e.message
            : e instanceof DOMException && e.name === "NotAllowedError"
              ? "Sharing was cancelled, so the voice can't be recorded."
              : `Couldn't capture the tab audio: ${e instanceof Error ? e.message : String(e)}`;
        setState({ kind: "noAudio", message });
        return;
      }
    }
    await ensureFonts(branding);
    const canvas = recordCanvasRef.current;
    if (!canvas) return;
    let lastProgress = 0;
    const handle = recordVideo({
      canvas,
      timeline,
      layout,
      settings,
      branding,
      dataRelease,
      voice: withAudio ? runtime.voice : null,
      audioTrack,
      onMeasured: runtime.onMeasured,
      onTime: (t, scene) => {
        const now = performance.now();
        if (now - lastProgress < 200) return;
        lastProgress = now;
        setState({ kind: "recording", t, scene });
      },
      onWarning: (w) => setWarnings((list) => (list.includes(w) ? list : [...list, w])),
    });
    handleRef.current = handle;
    setState({ kind: "recording", t: 0, scene: 0 });
    try {
      const result = await handle.done;
      if (handleRef.current !== handle) return;
      handleRef.current = null;
      if (result.status === "hidden") {
        setState({ kind: "hidden" });
        return;
      }
      if (result.status !== "done" || !result.blob) {
        setState({ kind: "idle" });
        return;
      }
      const fileName = videoFileName(reportName, settings.aspect, extensionFor(result.mimeType));
      const videoUrl = URL.createObjectURL(result.blob);
      urlsRef.current.push(videoUrl);
      const video = { blob: result.blob, fileName, url: videoUrl };
      download(videoUrl, fileName);
      let srt: { blob: Blob; fileName: string; url: string } | undefined;
      if (settings.captions.srt) {
        const text = buildSrt(result.log, layout, branding);
        if (text) {
          const blob = new Blob([text], { type: "application/x-subrip" });
          const url = URL.createObjectURL(blob);
          urlsRef.current.push(url);
          srt = { blob, fileName: fileName.replace(/\.(mp4|webm)$/, ".srt"), url };
          // A second download straight after the first can be blocked; the Download buttons remain
          const s = srt;
          setTimeout(() => download(s.url, s.fileName), 600);
        }
      }
      setState({ kind: "done", video, srt, audio: !!audioTrack });
    } catch (e) {
      handleRef.current = null;
      setState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const cancel = () => {
    handleRef.current?.cancel();
  };

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <FormControlLabel
      key={label}
      control={<Checkbox size="small" checked={checked} disabled={busy} onChange={(e) => onChange(e.target.checked)} />}
      label={<Typography sx={{ fontSize: 13 }}>{label}</Typography>}
      sx={{ ml: -0.5 }}
    />
  );

  const format = extensionFor(mimeType).toUpperCase();
  const recordLabel = recordAudio ? "Record video" : ttsOn ? "Record video (captions only)" : "Record video";

  const settingsColumn = (
    <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2.5, overflowY: "auto", minHeight: 0, borderRight: narrow ? 0 : "1px solid", borderColor: "grey.300" }}>
      <Box>
        <Box sx={{ ...monoLabelSx, mb: 1 }}>Aspect</Box>
        <Box role="radiogroup" aria-label="Aspect ratio" sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          {(["9:16", "16:9"] as const).map((a) => (
            <AspectThumb
              key={a}
              aspect={a}
              selected={settings.aspect === a}
              disabled={busy}
              onSelect={() => updateVideo({ aspect: a })}
              draw={drawThumb}
            />
          ))}
        </Box>
      </Box>

      <Box>
        <Box sx={{ ...monoLabelSx, mb: 0.5 }}>Include</Box>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {toggle("Burned-in captions", settings.captions.burnIn, (v) => updateVideo({ captions: { burnIn: v } }))}
          {toggle("Captions file (.srt)", settings.captions.srt, (v) => updateVideo({ captions: { srt: v } }))}
          {toggle("Source on every scene", settings.showSource, (v) => updateVideo({ showSource: v }))}
          {toggle("End card", settings.endCard, (v) => updateVideo({ endCard: v }))}
        </Box>
      </Box>

      <Box>
        <Box sx={{ ...monoLabelSx, mb: 0.75 }}>Voice</Box>
        <Box sx={{ pointerEvents: busy ? "none" : undefined, opacity: busy ? 0.6 : 1 }}>
          <VoiceControls settings={settings} voices={voices} updateVideo={updateVideo} />
        </Box>
        {ttsOn && (
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>
            {canCaptureAudio
              ? "Voice can be recorded in Chrome and Edge. You'll be asked to share this tab's audio: pick this tab and tick “Share tab audio”."
              : "This browser can't record the voice (Chrome and Edge can). The video will have captions only; the voice still helps time them."}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Chip size="small" label={mimeType ? format : "Not supported"} variant="outlined" sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11 }} />
        <Typography sx={{ fontSize: 13 }}>
          {timeline.entries.length} scene{timeline.entries.length === 1 ? "" : "s"} · {formatSeconds(timeline.total)}
        </Typography>
      </Box>
    </Box>
  );

  const frame = FRAME_SIZE[settings.aspect];
  const maxW = Math.max(120, stage.w - 32);
  const maxH = Math.max(120, stage.h - 32);
  const scale = Math.min(maxW / frame.width, maxH / frame.height);
  const recording = state.kind === "recording" || state.kind === "preparing";

  const stageColumn = (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
      <Box ref={stageRef} sx={{ flex: 1, minHeight: narrow ? 420 : 0, bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {/* Full-resolution canvas the recorder captures; shown while recording */}
        <Canvas
          ref={recordCanvasRef}
          width={frame.width}
          height={frame.height}
          aria-label="Recording"
          sx={{
            display: recording ? "block" : "none",
            width: Math.floor(frame.width * scale),
            height: Math.floor(frame.height * scale),
            bgcolor: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
          }}
        />
        {!recording && stage.w > 0 && (
          <ScenePreviewCanvas
            timeline={timeline}
            layout={layout}
            settings={settings}
            dataRelease={dataRelease}
            index={thumbIndex}
            maxWidth={maxW}
            maxHeight={maxH - 44}
            voice={runtime.voice}
            onMeasured={runtime.onMeasured}
          />
        )}
      </Box>

      <Box sx={{ borderTop: "1px solid", borderColor: "grey.300", p: 2, display: "flex", flexDirection: "column", gap: 1.25 }} aria-live="polite">
        {state.kind === "recording" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ color: "#e53935", fontSize: 10 }}>
                <FontAwesomeIcon icon={faCircle} />
              </Box>
              <Typography sx={{ fontSize: 13 }}>
                Recording scene {Math.min(state.scene + 1, timeline.entries.length)} / {timeline.entries.length} · {formatSeconds(state.t)} / {formatSeconds(timeline.total)}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={Math.min(100, (state.t / (timeline.total || 1)) * 100)} />
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Recording runs in real time. Keep this tab in front until it finishes.
            </Typography>
          </>
        )}
        {state.kind === "preparing" && <Typography sx={{ fontSize: 13 }}>Getting ready…</Typography>}
        {state.kind === "done" && (
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
            <Box sx={{ color: "success.main", fontSize: 20 }}>
              <FontAwesomeIcon icon={faCircleCheck} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Video ready — download started</Typography>
              <Typography sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 12, overflowWrap: "anywhere" }}>
                {state.video.fileName} · {formatBytes(state.video.blob.size)}
                {state.audio ? " · with voice" : " · captions only"}
              </Typography>
            </Box>
          </Box>
        )}
        {state.kind === "hidden" && (
          <Alert severity="warning" sx={{ fontSize: 13 }}>
            Recording stopped because the tab went to the background (browsers slow down hidden tabs). Keep this tab in front and record again.
          </Alert>
        )}
        {state.kind === "noAudio" && (
          <Alert
            severity="warning"
            sx={{ fontSize: 13 }}
            action={
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <Button size="small" color="inherit" onClick={() => record(true)} sx={{ textTransform: "none" }}>
                  Try again
                </Button>
                <Button size="small" color="inherit" onClick={() => record(false)} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
                  Captions only
                </Button>
              </Box>
            }
          >
            {state.message}
          </Alert>
        )}
        {state.kind === "error" && (
          <Alert severity="error" sx={{ fontSize: 13 }}>
            {state.message}
          </Alert>
        )}
        {warnings.map((w) => (
          <Alert key={w} severity="warning" sx={{ fontSize: 13 }}>
            {WARNING_TEXT[w]}
          </Alert>
        ))}

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {state.kind === "recording" || state.kind === "preparing" ? (
            <Button variant="outlined" onClick={cancel} disabled={state.kind === "preparing"} sx={{ textTransform: "none" }}>
              Cancel
            </Button>
          ) : state.kind === "done" ? (
            <>
              {state.srt && (
                <Button onClick={() => download(state.srt!.url, state.srt!.fileName)} startIcon={<FontAwesomeIcon icon={faDownload} />} sx={{ textTransform: "none" }}>
                  Captions (.srt)
                </Button>
              )}
              <Button variant="outlined" onClick={() => download(state.video.url, state.video.fileName)} startIcon={<FontAwesomeIcon icon={faDownload} />} sx={{ textTransform: "none" }}>
                Download
              </Button>
              <Button variant="contained" onClick={() => record(recordAudio)} sx={{ textTransform: "none" }}>
                Record again
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              disabled={!mimeType || !timeline.entries.length || !allImagesReady}
              onClick={() => record(recordAudio)}
              startIcon={<FontAwesomeIcon icon={faCircle} style={{ color: "#e53935", fontSize: 10 }} />}
              sx={{ textTransform: "none" }}
            >
              {state.kind === "hidden" || state.kind === "error" ? "Record again" : recordLabel}
            </Button>
          )}
        </Box>
        {!mimeType && (
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>This browser can't record video (no MediaRecorder support).</Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: narrow ? "minmax(0,1fr)" : "340px minmax(0,1fr)",
        flex: 1,
        height: narrow ? "auto" : "100%",
        minHeight: 0,
      }}
    >
      {settingsColumn}
      {stageColumn}
    </Box>
  );
};

export default VideoRenderStep;
