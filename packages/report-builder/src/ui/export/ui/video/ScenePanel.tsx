import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import type { DeepPartial, Hotspot, VideoScene, VideoSceneOverride, VideoSettings } from "../../types";
import { sceneDuration, timingFor, tokenize } from "../../video/tts";
import { monoLabelSx } from "../SlidesMappingStep";
import { formatSeconds, type VoicesState } from "./useVideoRuntime";

const COMMIT_DELAY_MS = 500;

/** Text field state that commits after a pause or on blur (not on every keystroke). */
function useCommittedText(value: string, commit: (v: string) => void) {
  const [local, setLocal] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const localRef = useRef(local);
  localRef.current = local;
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const lastCommitted = useRef(value);

  // Outside changes (another tab, undo) replace the local text when it isn't being edited
  useEffect(() => {
    if (value !== lastCommitted.current && timer.current === undefined) setLocal(value);
    lastCommitted.current = value;
  }, [value]);

  const flush = () => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = undefined;
    if (localRef.current !== lastCommitted.current) {
      lastCommitted.current = localRef.current;
      commitRef.current(localRef.current);
    }
  };
  useEffect(() => flush, []); // commit pending text on unmount

  const onChange = (v: string) => {
    setLocal(v);
    if (timer.current !== undefined) clearTimeout(timer.current);
    timer.current = setTimeout(flush, COMMIT_DELAY_MS);
  };
  return { value: local, onChange, onBlur: flush };
}

export const hotspotStartLabel = (h: Hotspot, narration: string): string => {
  if (h.start.type === "time") return `at ${h.start.s.toFixed(1)} s`;
  const words = tokenize(narration);
  const word = words[Math.min(h.start.index, words.length - 1)]?.text.replace(/[^\w'-]/g, "");
  return word ? `on “${word}”` : "at the start";
};

export const SHAPE_LABEL: Record<Hotspot["shape"], string> = { box: "Box", ring: "Ring", arrow: "Arrow" };

interface VoiceControlsProps {
  settings: VideoSettings;
  voices: VoicesState;
  updateVideo: (patch: DeepPartial<VideoSettings>) => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({ settings, voices, updateVideo }) => {
  const locked = !voices.loading && !voices.supported;
  const mode = locked ? "none" : settings.voice.mode;
  const selected = voices.voices.find((v) => v.voiceURI === settings.voice.voiceURI) ?? voices.voices.find((v) => v.localService) ?? voices.voices[0];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={mode}
        onChange={(_, v) => v && updateVideo({ voice: { mode: v } })}
        aria-label="Narration voice"
      >
        <ToggleButton value="tts" disabled={locked} sx={{ textTransform: "none", flex: 1 }}>
          TTS
        </ToggleButton>
        <ToggleButton value="none" sx={{ textTransform: "none", flex: 1 }}>
          Captions only
        </ToggleButton>
      </ToggleButtonGroup>
      {locked && (
        <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
          This browser has no English text-to-speech voices, so the video uses captions only.
        </Typography>
      )}
      {mode === "tts" && !locked && (
        <>
          <FormControl size="small" fullWidth>
            <InputLabel id="video-voice-label">Voice</InputLabel>
            <Select
              labelId="video-voice-label"
              label="Voice"
              value={selected?.voiceURI ?? ""}
              onChange={(e) => updateVideo({ voice: { voiceURI: String(e.target.value) } })}
              sx={{ fontSize: 13 }}
            >
              {voices.voices.map((v) => (
                <MenuItem key={v.voiceURI} value={v.voiceURI} sx={{ fontSize: 13 }}>
                  {v.name} · {v.lang}
                  {v.localService ? "" : " · online"}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box>
            <Typography id="video-rate-label" sx={{ fontSize: 12, color: "text.secondary" }}>
              Rate · {settings.voice.rate.toFixed(2)}×
            </Typography>
            <Slider
              size="small"
              min={0.8}
              max={1.3}
              step={0.05}
              value={settings.voice.rate}
              onChange={(_, v) => updateVideo({ voice: { rate: v as number } })}
              aria-labelledby="video-rate-label"
            />
          </Box>
        </>
      )}
    </Box>
  );
};

interface ScenePanelProps {
  scene: VideoScene;
  settings: VideoSettings;
  voices: VoicesState;
  timingMeasured: boolean;
  duration: number;
  hasImage: boolean;
  imageChanged: boolean;
  updateScene: (sceneId: string, patch: Partial<VideoSceneOverride>) => void;
  updateVideo: (patch: DeepPartial<VideoSettings>) => void;
  onEditHotspots: (addNew: boolean) => void;
  onConfirmPositions: () => void;
}

/** Right column of the storyboard. Keyed by scene id so text state resets per scene. */
export const ScenePanel: React.FC<ScenePanelProps> = ({
  scene,
  settings,
  voices,
  timingMeasured,
  duration,
  hasImage,
  imageChanged,
  updateScene,
  updateVideo,
  onEditHotspots,
  onConfirmPositions,
}) => {
  const title = useCommittedText(scene.title, (v) => updateScene(scene.sceneId, { title: v }));
  const narration = useCommittedText(scene.narration, (v) => updateScene(scene.sceneId, { narration: v }));
  const wordCount = tokenize(narration.value).length;
  // While typing, show the estimate for the draft text
  const draftDuration =
    narration.value === scene.narration
      ? duration
      : sceneDuration(timingFor(narration.value, { rate: settings.voice.rate }), scene.minDurationS);
  const measured = narration.value === scene.narration && timingMeasured;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, p: 2 }}>
      <TextField
        label={scene.kind === "statement" ? "On-screen text" : "On-screen title"}
        size="small"
        fullWidth
        multiline
        maxRows={4}
        value={title.value}
        onChange={(e) => title.onChange(e.target.value)}
        onBlur={title.onBlur}
        InputProps={{ sx: { fontSize: 13 } }}
      />

      <Box>
        <TextField
          label="Narration"
          size="small"
          fullWidth
          multiline
          minRows={5}
          maxRows={12}
          value={narration.value}
          onChange={(e) => narration.onChange(e.target.value)}
          onBlur={narration.onBlur}
          placeholder="What the voice says (and the captions show) during this scene"
          InputProps={{ sx: { fontSize: 13 } }}
        />
        <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
          {wordCount} word{wordCount === 1 ? "" : "s"} · {formatSeconds(draftDuration)} ·{" "}
          {wordCount === 0 ? `minimum ${scene.minDurationS} s` : measured ? "timed from voice" : "timing estimated"}
        </Typography>
      </Box>

      {scene.kind === "figure" && (
        <Box>
          <Box sx={{ ...monoLabelSx, mb: 0.75 }}>Hotspots</Box>
          {imageChanged && (
            <Alert
              severity="warning"
              sx={{ mb: 1, fontSize: 12, py: 0 }}
              action={
                <Button size="small" color="inherit" onClick={onConfirmPositions} sx={{ textTransform: "none", whiteSpace: "nowrap" }}>
                  Positions look right
                </Button>
              }
            >
              The figure has changed since these hotspots were drawn. Check their positions.
            </Alert>
          )}
          {scene.hotspots.length === 0 ? (
            <Typography sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}>No hotspots yet.</Typography>
          ) : (
            <Box component="ol" sx={{ m: 0, mb: 1, pl: 2.5 }}>
              {scene.hotspots.map((h) => (
                <Typography component="li" key={h.id} sx={{ fontSize: 12 }}>
                  {SHAPE_LABEL[h.shape]}
                  {h.label ? ` · “${h.label}”` : ""} · {hotspotStartLabel(h, scene.narration)}
                  {h.spotlight ? " · spotlight" : ""}
                </Typography>
              ))}
            </Box>
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="outlined"
              disabled={!hasImage}
              onClick={() => onEditHotspots(true)}
              startIcon={<FontAwesomeIcon icon={faPlus} size="xs" />}
              sx={{ textTransform: "none" }}
            >
              Add hotspot
            </Button>
            <Button
              size="small"
              disabled={!hasImage || scene.hotspots.length === 0}
              onClick={() => onEditHotspots(false)}
              sx={{ textTransform: "none" }}
            >
              Edit hotspots
            </Button>
          </Box>
          {!hasImage && (
            <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.5 }}>
              Hotspots need the figure image.
            </Typography>
          )}
        </Box>
      )}

      <Box>
        <Box sx={{ ...monoLabelSx, mb: 0.75 }}>Voice · all scenes</Box>
        <VoiceControls settings={settings} voices={voices} updateVideo={updateVideo} />
      </Box>
    </Box>
  );
};

export default ScenePanel;
