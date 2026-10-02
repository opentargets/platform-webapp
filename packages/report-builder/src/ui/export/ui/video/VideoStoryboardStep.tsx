import React, { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Box, Checkbox, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { hotspotImageChanged } from "../../plan/video";
import type {
  DeepPartial,
  ExportWarning,
  Hotspot,
  VideoPlan,
  VideoScene,
  VideoSceneOverride,
  VideoSettings,
} from "../../types";
import { buildTimeline, layoutFor } from "../../video/compositor";
import { monoLabelSx } from "../SlidesMappingStep";
import { HotspotEditor } from "./HotspotEditor";
import { ScenePanel } from "./ScenePanel";
import { type PreviewHandle, ScenePreviewCanvas } from "./ScenePreviewCanvas";
import {
  formatSeconds,
  useElementSize,
  useSceneImages,
  useVideoTimeline,
  useVoices,
} from "./useVideoRuntime";

export const sceneKindLine = (scene: VideoScene): string => {
  const parts: string[] = [scene.kind === "end" ? "end card" : scene.kind];
  if (scene.kind === "figure" && scene.hotspots.length)
    parts.push(`${scene.hotspots.length} hotspot${scene.hotspots.length === 1 ? "" : "s"}`);
  parts.push(scene.narration.trim() ? "narrated" : "no narration");
  return parts.join(" · ");
};

interface SceneRowProps {
  scene: VideoScene;
  number: number | null; // position in the video (null when excluded)
  duration: number;
  selected: boolean;
  warnings: ExportWarning[];
  sortIndex?: number; // set for scenes that can be reordered
  onSelect: (id: string) => void;
  onInclude: (scene: VideoScene, include: boolean) => void;
}

const SceneRowBody: React.FC<SceneRowProps & { handleRef?: (el: Element | null) => void }> = ({
  scene,
  number,
  duration,
  selected,
  warnings,
  onSelect,
  onInclude,
  handleRef,
}) => (
  <Box
    role="option"
    aria-selected={selected}
    tabIndex={0}
    onClick={() => onSelect(scene.sceneId)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(scene.sceneId);
      }
    }}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 0.75,
      p: 0.75,
      pr: 1,
      border: "1px solid",
      borderColor: selected ? "primary.main" : "grey.300",
      bgcolor: selected ? "#f5f9fd" : "#fff",
      borderRadius: "3px",
      cursor: "pointer",
      opacity: scene.include ? 1 : 0.6,
      "&:focus-visible": { outline: "2px solid", outlineColor: "primary.dark" },
    }}
  >
    <Box
      ref={handleRef}
      aria-label={handleRef ? "Drag to reorder" : undefined}
      sx={{ width: 12, color: "grey.500", cursor: handleRef ? "grab" : "default", fontSize: 11, flexShrink: 0, textAlign: "center" }}
    >
      {handleRef && <FontAwesomeIcon icon={faGripVertical} />}
    </Box>
    <Checkbox
      size="small"
      checked={scene.include}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onInclude(scene, e.target.checked)}
      inputProps={{ "aria-label": `Include “${scene.title}”` }}
      sx={{ p: 0.25 }}
    />
    <Box sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: "text.secondary", width: 18, flexShrink: 0 }}>
      {number ?? "–"}
    </Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 600 }}>
        {scene.title || "(untitled)"}
      </Typography>
      <Typography noWrap sx={{ fontSize: 11, color: "text.secondary" }}>
        {sceneKindLine(scene)}
      </Typography>
    </Box>
    {warnings.length > 0 && (
      <Tooltip title={warnings.map((w) => w.message).join(" ")}>
        <Box
          component="span"
          aria-label={`${warnings.length} warning${warnings.length === 1 ? "" : "s"}`}
          sx={{ color: warnings.some((w) => w.severity === "warn") ? "warning.main" : "text.disabled", fontSize: 12 }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} />
        </Box>
      </Tooltip>
    )}
    <Box sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: "text.secondary", flexShrink: 0 }}>
      {formatSeconds(duration)}
    </Box>
  </Box>
);

const SortableSceneRow: React.FC<SceneRowProps & { sortIndex: number }> = (props) => {
  const { ref, handleRef, isDragging } = useSortable({ id: props.scene.sceneId, index: props.sortIndex });
  return (
    <Box ref={ref} sx={{ opacity: isDragging ? 0.85 : 1 }}>
      <SceneRowBody {...props} handleRef={handleRef} />
    </Box>
  );
};

interface VideoStoryboardStepProps {
  plan: VideoPlan;
  settings: VideoSettings;
  dataRelease?: string;
  updateVideo: (patch: DeepPartial<VideoSettings>) => void;
  updateScene: (sceneId: string, patch: Partial<VideoSceneOverride>) => void;
  reorderScenes: (order: string[]) => void;
}

export const VideoStoryboardStep: React.FC<VideoStoryboardStepProps> = ({
  plan,
  settings,
  dataRelease,
  updateVideo,
  updateScene,
  reorderScenes,
}) => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const { scenes } = plan;
  const voices = useVoices();
  const { images, loading } = useSceneImages(scenes);
  const runtime = useVideoTimeline(scenes, settings, voices, images, loading);
  const layout = useMemo(() => layoutFor(settings.aspect), [settings.aspect]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ addNew: boolean } | null>(null);
  const [playhead, setPlayhead] = useState<number | null>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const [previewBoxRef, previewBox] = useElementSize<HTMLDivElement>();

  const selected = scenes.find((s) => s.sceneId === selectedId) ?? scenes.find((s) => s.include) ?? scenes[0];
  const timelineIndex = runtime.timeline.entries.findIndex((e) => e.scene.sceneId === selected?.sceneId);

  // An excluded scene still previews on its own
  const soloTimeline = useMemo(() => {
    if (!selected || timelineIndex >= 0) return null;
    return buildTimeline([
      {
        scene: selected,
        duration: runtime.durations[selected.sceneId],
        timing: runtime.timings[selected.sceneId],
        image: images[selected.sceneId],
        imageLoading: loading[selected.sceneId],
      },
    ]);
  }, [selected, timelineIndex, runtime.durations, runtime.timings, images, loading]);

  const warnings = useMemo(() => [...plan.warnings, ...runtime.runtimeWarnings], [plan.warnings, runtime.runtimeWarnings]);
  const warningsByScene = useMemo(() => {
    const m = new Map<string, ExportWarning[]>();
    scenes.forEach((s) => {
      if (!s.blockId) return;
      const list = warnings.filter((w) => w.nodeId === s.blockId);
      if (list.length) m.set(s.sceneId, list);
    });
    return m;
  }, [scenes, warnings]);
  const longVideo = warnings.find((w) => w.code === "LONG_VIDEO");

  const middle = useMemo(() => scenes.filter((s) => s.kind !== "title" && s.kind !== "end"), [scenes]);

  const onInclude = useCallback(
    (scene: VideoScene, include: boolean) => {
      if (scene.kind === "end") updateVideo({ endCard: include });
      else updateScene(scene.sceneId, { include });
    },
    [updateScene, updateVideo]
  );

  const numbers = useMemo(() => {
    const m = new Map<string, number>();
    runtime.timeline.entries.forEach((e, i) => m.set(e.scene.sceneId, i + 1));
    return m;
  }, [runtime.timeline]);

  const rowProps = (scene: VideoScene) => ({
    scene,
    number: numbers.get(scene.sceneId) ?? null,
    duration: runtime.durations[scene.sceneId] ?? scene.minDurationS,
    selected: scene.sceneId === selected?.sceneId,
    warnings: warningsByScene.get(scene.sceneId) ?? EMPTY,
    onSelect: setSelectedId,
    onInclude,
  });

  const saveHotspots = (hotspots: Hotspot[], imageHash: string) => {
    if (selected) updateScene(selected.sceneId, { hotspots, imageHash });
    setEditor(null);
  };

  const selectedImage = selected ? images[selected.sceneId] : undefined;
  const imageChanged = !!selected && hotspotImageChanged(selected, runtime.imageHashes[selected.sceneId]);

  const sceneList = (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, bgcolor: "grey.50", borderRight: narrow ? 0 : "1px solid", borderBottom: narrow ? "1px solid" : 0, borderColor: "grey.300" }}>
      <Box sx={{ ...monoLabelSx, px: 1.5, pt: 1.5, pb: 1 }}>
        Scenes · {runtime.timeline.entries.length} · {formatSeconds(runtime.timeline.total)}
      </Box>
      <Box role="listbox" aria-label="Scenes" sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
        {scenes
          .filter((s) => s.kind === "title")
          .map((s) => (
            <SceneRowBody key={s.sceneId} {...rowProps(s)} />
          ))}
        <DragDropProvider
          onDragEnd={(event) => {
            if (event.canceled) return;
            const { source } = event.operation;
            if (!isSortable(source)) return;
            const { initialIndex, index } = source;
            if (initialIndex !== index) reorderScenes(arrayMove(middle, initialIndex, index).map((s) => s.sceneId));
          }}
        >
          {middle.map((s, i) => (
            <SortableSceneRow key={s.sceneId} {...rowProps(s)} sortIndex={i} />
          ))}
        </DragDropProvider>
        {scenes
          .filter((s) => s.kind === "end")
          .map((s) => (
            <SceneRowBody key={s.sceneId} {...rowProps(s)} />
          ))}
      </Box>
    </Box>
  );

  const preview = (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
      {longVideo && (
        <Alert severity="warning" sx={{ borderRadius: 0, py: 0, fontSize: 13 }}>
          {longVideo.message}
        </Alert>
      )}
      <Box ref={previewBoxRef} sx={{ flex: 1, minHeight: narrow ? 420 : 0, bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center", p: 2, position: "relative" }}>
        {selected && previewBox.w > 0 && (
          <ScenePreviewCanvas
            ref={previewRef}
            timeline={soloTimeline ?? runtime.timeline}
            layout={layout}
            settings={settings}
            dataRelease={dataRelease}
            index={soloTimeline ? 0 : timelineIndex}
            maxWidth={previewBox.w - 32}
            maxHeight={Math.max(120, previewBox.h - 32 - 44)}
            voice={runtime.voice}
            onMeasured={runtime.onMeasured}
            onTime={(t, i) => {
              setPlayhead(soloTimeline ? null : t);
              // Follow the playing scene in the list
              const playing = (soloTimeline ?? runtime.timeline).entries[i]?.scene.sceneId;
              if (t !== null && playing) setSelectedId(playing);
            }}
          />
        )}
        {selected && !selected.include && (
          <Typography sx={{ position: "absolute", top: 8, left: 0, right: 0, textAlign: "center", fontSize: 12, color: "text.secondary" }}>
            Excluded from the video
          </Typography>
        )}
      </Box>
    </Box>
  );

  const panel = (
    <Box sx={{ minHeight: 0, overflowY: "auto", borderLeft: narrow ? 0 : "1px solid", borderTop: narrow ? "1px solid" : 0, borderColor: "grey.300" }}>
      {selected && (
        <ScenePanel
          key={selected.sceneId}
          scene={selected}
          settings={settings}
          voices={voices}
          timingMeasured={runtime.timings[selected.sceneId]?.method === "measured"}
          duration={runtime.durations[selected.sceneId] ?? selected.minDurationS}
          hasImage={!!selectedImage}
          imageChanged={imageChanged}
          updateScene={updateScene}
          updateVideo={updateVideo}
          onEditHotspots={(addNew) => setEditor({ addNew })}
          onConfirmPositions={() =>
            selectedImage && updateScene(selected.sceneId, { imageHash: selectedImage.hash })
          }
        />
      )}
    </Box>
  );

  const total = runtime.timeline.total || 1;
  const strip = (
    <Box
      aria-label="Scene strip"
      sx={{ gridColumn: "1 / -1", borderTop: "1px solid", borderColor: "grey.300", px: 2, py: 1, display: "flex", alignItems: "center", gap: 1.5 }}
    >
      <Box sx={{ position: "relative", display: "flex", flex: 1, height: 22, gap: "2px" }}>
        {runtime.timeline.entries.map((e, i) => (
          <Tooltip key={e.scene.sceneId} title={`${i + 1}. ${e.scene.title} · ${formatSeconds(e.duration)}`}>
            <Box
              onClick={() => setSelectedId(e.scene.sceneId)}
              sx={{
                flex: `${e.duration} 0 0`,
                minWidth: 4,
                bgcolor: e.scene.sceneId === selected?.sceneId ? "primary.main" : e.scene.kind === "figure" ? "#7bb3de" : "grey.400",
                borderRadius: "2px",
                cursor: "pointer",
              }}
            />
          </Tooltip>
        ))}
        {playhead !== null && (
          <Box
            aria-hidden
            sx={{ position: "absolute", top: -3, bottom: -3, width: 2, bgcolor: "#ff6350", left: `${(playhead / total) * 100}%`, pointerEvents: "none" }}
          />
        )}
      </Box>
      <Typography sx={{ fontFamily: "'Roboto Mono', monospace", fontSize: 11, color: "text.secondary", flexShrink: 0 }}>
        {formatSeconds(runtime.timeline.total)}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: narrow ? "minmax(0,1fr)" : "260px minmax(0,1fr) 300px",
        gridTemplateRows: narrow ? "auto" : "minmax(0,1fr) auto",
        flex: 1,
        height: narrow ? "auto" : "100%",
        minHeight: 0,
      }}
    >
      {sceneList}
      {preview}
      {panel}
      {strip}
      {editor && selected && selectedImage && (
        <HotspotEditor
          open
          scene={selected}
          image={selectedImage}
          timing={runtime.timings[selected.sceneId]}
          duration={runtime.durations[selected.sceneId]}
          settings={settings}
          dataRelease={dataRelease}
          voice={runtime.voice}
          startAdding={editor.addNew}
          onMeasured={runtime.onMeasured}
          onSave={saveHotspots}
          onClose={() => setEditor(null)}
        />
      )}
    </Box>
  );
};

const EMPTY: ExportWarning[] = [];

export default VideoStoryboardStep;
