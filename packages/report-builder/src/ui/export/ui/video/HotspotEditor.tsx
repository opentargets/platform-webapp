import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { v4 as uuid } from "uuid";
import type { Hotspot, HotspotShape, VideoScene, VideoSettings } from "../../types";
import {
  arrowTip,
  buildTimeline,
  defaultArrowFrom,
  HOTSPOT_COLOR,
  hotspotStartS,
  layoutFor,
} from "../../video/compositor";
import type { SceneImage } from "../../video/images";
import type { SceneTiming } from "../../video/tts";
import { tokenize } from "../../video/tts";
import { monoLabelSx } from "../SlidesMappingStep";
import { type PreviewHandle, ScenePreviewCanvas } from "./ScenePreviewCanvas";
import { SHAPE_LABEL } from "./ScenePanel";
import { useElementSize } from "./useVideoRuntime";

type Rect = Hotspot["rect"];
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN_SIZE = 0.01;

type Drag =
  | { kind: "draw"; id: string; x0: number; y0: number }
  | { kind: "move"; id: string; x0: number; y0: number; rect: Rect; from?: { x: number; y: number } }
  | { kind: "resize"; id: string; handle: Handle; rect: Rect }
  | { kind: "tail"; id: string };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const clampRect = (r: Rect): Rect => {
  const w = Math.min(1, Math.max(0, r.w));
  const h = Math.min(1, Math.max(0, r.h));
  return { x: Math.max(0, Math.min(1 - w, r.x)), y: Math.max(0, Math.min(1 - h, r.y)), w, h };
};

const resizeRect = (r: Rect, handle: Handle, px: number, py: number): Rect => {
  let x1 = r.x;
  let y1 = r.y;
  let x2 = r.x + r.w;
  let y2 = r.y + r.h;
  if (handle.includes("w")) x1 = Math.min(px, x2 - MIN_SIZE);
  if (handle.includes("e")) x2 = Math.max(px, x1 + MIN_SIZE);
  if (handle.includes("n")) y1 = Math.min(py, y2 - MIN_SIZE);
  if (handle.includes("s")) y2 = Math.max(py, y1 + MIN_SIZE);
  return clampRect({ x: clamp01(x1), y: clamp01(y1), w: clamp01(x2) - clamp01(x1), h: clamp01(y2) - clamp01(y1) });
};

const handlePos = (h: Handle): { left: string; top: string; cursor: string } => ({
  left: h.includes("w") ? "0%" : h.includes("e") ? "100%" : "50%",
  top: h.includes("n") ? "0%" : h.includes("s") ? "100%" : "50%",
  cursor: h === "n" || h === "s" ? "ns-resize" : h === "e" || h === "w" ? "ew-resize" : h === "nw" || h === "se" ? "nwse-resize" : "nesw-resize",
});

interface HotspotEditorProps {
  open: boolean;
  scene: VideoScene;
  image: SceneImage;
  timing: SceneTiming;
  duration: number;
  settings: VideoSettings;
  dataRelease?: string;
  voice: { voice: SpeechSynthesisVoice; rate: number } | null;
  startAdding: boolean;
  onMeasured?: (sceneId: string, narration: string, timing: SceneTiming) => void;
  onSave: (hotspots: Hotspot[], imageHash: string) => void;
  onClose: () => void;
}

export const HotspotEditor: React.FC<HotspotEditorProps> = ({
  open,
  scene,
  image,
  timing,
  duration,
  settings,
  dataRelease,
  voice,
  startAdding,
  onMeasured,
  onSave,
  onClose,
}) => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down("md"));
  const [drafts, setDrafts] = useState<Hotspot[]>(scene.hotspots);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<HotspotShape>("box");
  const [spotlightTool, setSpotlightTool] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const dragRef = useRef<Drag | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<PreviewHandle>(null);
  const [areaRef, area] = useElementSize<HTMLDivElement>();

  // Fresh drafts each time the editor opens
  useEffect(() => {
    if (!open) return;
    setDrafts(scene.hotspots);
    // "Edit hotspots" opens on the first one; "Add hotspot" opens ready to draw
    setSelectedId(startAdding ? null : scene.hotspots[0]?.id ?? null);
    setPreviewing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const words = useMemo(() => tokenize(scene.narration), [scene.narration]);
  const selected = drafts.find((h) => h.id === selectedId) ?? null;

  const update = useCallback((id: string, patch: Partial<Hotspot>) => {
    setDrafts((list) => list.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  const remove = useCallback((id: string) => {
    setDrafts((list) => list.filter((h) => h.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  }, []);

  // ---------- geometry ----------

  const pad = 24;
  const fitScale = area.w && area.h ? Math.min((area.w - pad * 2) / image.width, (area.h - pad * 2) / image.height) : 0;
  const W = Math.max(0, Math.floor(image.width * fitScale));
  const H = Math.max(0, Math.floor(image.height * fitScale));

  const pointAt = (e: React.PointerEvent) => {
    const r = overlayRef.current!.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };

  const beginDrag = (e: React.PointerEvent, drag: Drag) => {
    e.stopPropagation();
    e.preventDefault();
    overlayRef.current?.setPointerCapture(e.pointerId);
    dragRef.current = drag;
  };

  const onOverlayPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = pointAt(e);
    const id = uuid();
    const hotspot: Hotspot = {
      id,
      shape: tool,
      rect: { x: p.x, y: p.y, w: 0, h: 0 },
      spotlight: spotlightTool,
      start: words.length ? { type: "word", index: 0 } : { type: "time", s: 0 },
      end: "scene",
    };
    setDrafts((list) => [...list, hotspot]);
    setSelectedId(id);
    beginDrag(e, { kind: "draw", id, x0: p.x, y0: p.y });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const p = pointAt(e);
    setDrafts((list) =>
      list.map((h) => {
        if (h.id !== drag.id) return h;
        switch (drag.kind) {
          case "draw":
            return {
              ...h,
              rect: clampRect({
                x: Math.min(drag.x0, p.x),
                y: Math.min(drag.y0, p.y),
                w: Math.abs(p.x - drag.x0),
                h: Math.abs(p.y - drag.y0),
              }),
            };
          case "move": {
            const rect = clampRect({ ...drag.rect, x: drag.rect.x + p.x - drag.x0, y: drag.rect.y + p.y - drag.y0 });
            const dx = rect.x - drag.rect.x;
            const dy = rect.y - drag.rect.y;
            return {
              ...h,
              rect,
              arrowFrom: drag.from ? { x: clamp01(drag.from.x + dx), y: clamp01(drag.from.y + dy) } : h.arrowFrom,
            };
          }
          case "resize":
            return { ...h, rect: resizeRect(drag.rect, drag.handle, p.x, p.y) };
          case "tail":
            return { ...h, arrowFrom: p };
        }
        return h;
      })
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (overlayRef.current?.hasPointerCapture(e.pointerId)) overlayRef.current.releasePointerCapture(e.pointerId);
    if (drag?.kind !== "draw") return;
    const h = draftsRef.current.find((x) => x.id === drag.id);
    if (!h) return;
    // A click (no drag) doesn't make a hotspot; it just deselects
    if (h.rect.w < MIN_SIZE || h.rect.h < MIN_SIZE) {
      setSelectedId(null);
      setDrafts((list) => list.filter((x) => x.id !== drag.id));
    } else if (h.shape === "arrow") {
      update(h.id, { arrowFrom: defaultArrowFrom(h.rect) });
    }
  };

  // ---------- toolbar ----------

  const chooseTool = (shape: HotspotShape) => {
    setTool(shape);
    if (selected) update(selected.id, { shape, arrowFrom: shape === "arrow" ? selected.arrowFrom ?? defaultArrowFrom(selected.rect) : selected.arrowFrom });
  };

  const toggleSpotlight = (on: boolean) => {
    setSpotlightTool(on);
    if (selected) update(selected.id, { spotlight: on });
  };

  useEffect(() => {
    if (selected) {
      setTool(selected.shape);
      setSpotlightTool(selected.spotlight);
    }
    // Only when the selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ---------- keyboard ----------

  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (el.closest("input, textarea, [contenteditable=true]")) return;
    if (e.key === "Escape" && selected) {
      e.stopPropagation();
      e.preventDefault();
      setSelectedId(null);
      return;
    }
    if (!selected) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(selected.id);
      return;
    }
    const step = e.shiftKey ? 0.1 : 0.01;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const rect = clampRect({ ...selected.rect, x: selected.rect.x + d[0], y: selected.rect.y + d[1] });
    const dx = rect.x - selected.rect.x;
    const dy = rect.y - selected.rect.y;
    update(selected.id, {
      rect,
      arrowFrom: selected.arrowFrom ? { x: clamp01(selected.arrowFrom.x + dx), y: clamp01(selected.arrowFrom.y + dy) } : undefined,
    });
  };

  // ---------- preview ----------

  const layout = useMemo(() => layoutFor(settings.aspect), [settings.aspect]);
  const previewTimeline = useMemo(
    () => buildTimeline([{ scene: { ...scene, hotspots: drafts }, duration, timing, image }]),
    [scene, drafts, duration, timing, image]
  );
  const previewFrom = selected ? Math.max(0, hotspotStartS(selected, timing.wordTimes) - 1) : 0;
  const startPreview = () => setPreviewing(true);
  useEffect(() => {
    if (!previewing) return undefined;
    const t = setTimeout(() => previewRef.current?.playScene(0, previewFrom), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewing]);

  // Word → hotspot numbers that start on it
  const startsByWord = useMemo(() => {
    const m = new Map<number, number[]>();
    drafts.forEach((h, i) => {
      if (h.start.type !== "word" || h.id === selectedId) return;
      const idx = Math.min(h.start.index, words.length - 1);
      m.set(idx, [...(m.get(idx) ?? []), i + 1]);
    });
    return m;
  }, [drafts, selectedId, words.length]);

  // ---------- render ----------

  const renderHotspot = (h: Hotspot, i: number) => {
    const isSel = h.id === selectedId;
    const { rect } = h;
    return (
      <Box
        key={h.id}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          setSelectedId(h.id);
          const p = pointAt(e);
          beginDrag(e, { kind: "move", id: h.id, x0: p.x, y0: p.y, rect, from: h.arrowFrom });
        }}
        sx={{
          position: "absolute",
          left: `${rect.x * 100}%`,
          top: `${rect.y * 100}%`,
          width: `${rect.w * 100}%`,
          height: `${rect.h * 100}%`,
          boxSizing: "border-box",
          border: h.shape === "arrow" ? "none" : `3px solid ${HOTSPOT_COLOR}`,
          borderRadius: h.shape === "ring" ? "50%" : "4px",
          outline: isSel || h.shape === "arrow" ? `1px dashed ${isSel ? "#1e6ba8" : HOTSPOT_COLOR}` : "none",
          outlineOffset: 2,
          cursor: "move",
          bgcolor: h.spotlight ? "rgba(255,255,255,0.08)" : "transparent",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            left: -2,
            top: -24,
            bgcolor: HOTSPOT_COLOR,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            px: 0.75,
            borderRadius: "8px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {i + 1}
          {h.label ? ` · ${h.label}` : ""}
        </Box>
        {isSel &&
          HANDLES.map((handle) => {
            const pos = handlePos(handle);
            return (
              <Box
                key={handle}
                aria-hidden
                onPointerDown={(e) => beginDrag(e, { kind: "resize", id: h.id, handle, rect })}
                sx={{
                  position: "absolute",
                  left: pos.left,
                  top: pos.top,
                  width: 10,
                  height: 10,
                  ml: "-5px",
                  mt: "-5px",
                  bgcolor: "#fff",
                  border: "2px solid #1e6ba8",
                  cursor: pos.cursor,
                }}
              />
            );
          })}
      </Box>
    );
  };

  const arrows = drafts.filter((h) => h.shape === "arrow");

  const canvasArea = (
    <Box
      ref={areaRef}
      sx={{ flex: 1, minHeight: narrow ? 320 : 0, minWidth: 0, bgcolor: "grey.100", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
    >
      {previewing ? (
        <ScenePreviewCanvas
          ref={previewRef}
          timeline={previewTimeline}
          layout={layout}
          settings={settings}
          dataRelease={dataRelease}
          index={0}
          maxWidth={Math.max(100, area.w - pad * 2)}
          maxHeight={Math.max(100, area.h - pad * 2 - 40)}
          voice={voice}
          onMeasured={onMeasured}
          onPlayingChange={(p) => !p && setPreviewing(false)}
        />
      ) : (
        W > 0 && (
          <Box sx={{ position: "relative", width: W, height: H, boxShadow: "0 1px 4px rgba(0,0,0,0.2)", bgcolor: "#fff" }}>
            <Box component="img" src={image.dataUrl} alt={scene.title} draggable={false} sx={{ width: W, height: H, display: "block", userSelect: "none" }} />
            <Box
              ref={overlayRef}
              data-testid="hotspot-overlay"
              onPointerDown={onOverlayPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              sx={{ position: "absolute", inset: 0, cursor: "crosshair", touchAction: "none" }}
            >
              <svg width={W} height={H} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }} aria-hidden>
                {arrows.map((h) => {
                  const r = { x: h.rect.x * W, y: h.rect.y * H, w: h.rect.w * W, h: h.rect.h * H };
                  const f = h.arrowFrom ?? defaultArrowFrom(h.rect);
                  const from = { x: f.x * W, y: f.y * H };
                  const tip = arrowTip(from, r);
                  const a = Math.atan2(tip.y - from.y, tip.x - from.x);
                  const bx = tip.x - Math.cos(a) * 12;
                  const by = tip.y - Math.sin(a) * 12;
                  return (
                    <g key={h.id}>
                      <line x1={from.x} y1={from.y} x2={bx} y2={by} stroke={HOTSPOT_COLOR} strokeWidth={3} strokeLinecap="round" />
                      <polygon
                        points={`${tip.x},${tip.y} ${bx + Math.sin(a) * 6},${by - Math.cos(a) * 6} ${bx - Math.sin(a) * 6},${by + Math.cos(a) * 6}`}
                        fill={HOTSPOT_COLOR}
                      />
                    </g>
                  );
                })}
              </svg>
              {drafts.map(renderHotspot)}
              {arrows.map((h) => {
                const f = h.arrowFrom ?? defaultArrowFrom(h.rect);
                return (
                  <Box
                    key={`tail-${h.id}`}
                    aria-label={`Arrow ${drafts.indexOf(h) + 1} tail`}
                    onPointerDown={(e) => {
                      setSelectedId(h.id);
                      beginDrag(e, { kind: "tail", id: h.id });
                    }}
                    sx={{
                      position: "absolute",
                      left: `${f.x * 100}%`,
                      top: `${f.y * 100}%`,
                      width: 14,
                      height: 14,
                      ml: "-7px",
                      mt: "-7px",
                      borderRadius: "50%",
                      bgcolor: "#fff",
                      border: `3px solid ${HOTSPOT_COLOR}`,
                      cursor: "grab",
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )
      )}
      {!previewing && drafts.length === 0 && (
        <Typography sx={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 12, color: "text.secondary", pointerEvents: "none" }}>
          Drag on the figure to draw a hotspot.
        </Typography>
      )}
    </Box>
  );

  const startMode = selected?.start.type ?? "word";
  const endMode = selected && selected.end !== "scene" ? "time" : "scene";

  const sidePanel = (
    <Box sx={{ width: narrow ? "auto" : 320, flexShrink: 0, borderLeft: narrow ? 0 : "1px solid", borderTop: narrow ? "1px solid" : 0, borderColor: "grey.300", p: 2, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
      {!selected ? (
        <>
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
            Drag on the figure to draw a hotspot, or select one to edit it. Arrow keys nudge (Shift for 10%), Delete removes, Esc deselects.
          </Typography>
          {drafts.length > 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {drafts.map((h, i) => (
                <Button key={h.id} size="small" onClick={() => setSelectedId(h.id)} sx={{ justifyContent: "flex-start", textTransform: "none" }}>
                  {i + 1}. {SHAPE_LABEL[h.shape]}
                  {h.label ? ` · ${h.label}` : ""}
                </Button>
              ))}
            </Box>
          )}
        </>
      ) : (
        <>
          <Box sx={monoLabelSx}>Hotspot {drafts.indexOf(selected) + 1}</Box>
          <TextField
            label="Label"
            size="small"
            value={selected.label ?? ""}
            onChange={(e) => update(selected.id, { label: e.target.value || undefined })}
            InputProps={{ sx: { fontSize: 13 } }}
          />

          <Box>
            <Box sx={{ ...monoLabelSx, mb: 0.5 }}>Starts on</Box>
            <RadioGroup
              row
              value={startMode}
              onChange={(e) =>
                update(selected.id, {
                  start:
                    e.target.value === "word"
                      ? { type: "word", index: 0 }
                      : { type: "time", s: Number(hotspotStartS(selected, timing.wordTimes).toFixed(1)) },
                })
              }
            >
              <FormControlLabel value="word" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>A word</Typography>} disabled={!words.length} />
              <FormControlLabel value="time" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>At a time</Typography>} />
            </RadioGroup>
            {startMode === "word" ? (
              <Box sx={{ fontSize: 13, lineHeight: 1.9, maxHeight: 180, overflowY: "auto", border: "1px solid", borderColor: "grey.300", borderRadius: "4px", p: 1 }} role="listbox" aria-label="Narration words">
                {words.map((w, i) => {
                  const chosen = selected.start.type === "word" && Math.min(selected.start.index, words.length - 1) === i;
                  const others = startsByWord.get(i);
                  return (
                    <React.Fragment key={i}>
                      <Box
                        component="span"
                        role="option"
                        aria-selected={chosen}
                        tabIndex={0}
                        onClick={() => update(selected.id, { start: { type: "word", index: i } })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            update(selected.id, { start: { type: "word", index: i } });
                          }
                        }}
                        sx={{
                          cursor: "pointer",
                          px: "2px",
                          borderRadius: "3px",
                          bgcolor: chosen ? HOTSPOT_COLOR : "transparent",
                          color: chosen ? "#fff" : "inherit",
                          "&:hover": { bgcolor: chosen ? HOTSPOT_COLOR : "grey.200" },
                        }}
                      >
                        {w.text}
                        {others && (
                          <Box component="sup" sx={{ color: HOTSPOT_COLOR, fontWeight: 700, fontSize: 10, ml: "1px" }}>
                            {others.join(",")}
                          </Box>
                        )}
                      </Box>{" "}
                    </React.Fragment>
                  );
                })}
                {!words.length && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>This scene has no narration.</Typography>}
              </Box>
            ) : (
              <TextField
                size="small"
                type="number"
                label="Seconds"
                value={selected.start.type === "time" ? selected.start.s : 0}
                onChange={(e) => update(selected.id, { start: { type: "time", s: Math.max(0, Number(e.target.value) || 0) } })}
                inputProps={{ min: 0, step: 0.1 }}
                sx={{ width: 140 }}
              />
            )}
          </Box>

          <Box>
            <Box sx={{ ...monoLabelSx, mb: 0.5 }}>Ends</Box>
            <RadioGroup
              row
              value={endMode}
              onChange={(e) =>
                update(selected.id, {
                  end: e.target.value === "scene" ? "scene" : { type: "time", s: Number(Math.min(duration, hotspotStartS(selected, timing.wordTimes) + 2).toFixed(1)) },
                })
              }
            >
              <FormControlLabel value="scene" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>End of scene</Typography>} />
              <FormControlLabel value="time" control={<Radio size="small" />} label={<Typography sx={{ fontSize: 13 }}>At a time</Typography>} />
            </RadioGroup>
            {selected.end !== "scene" && (
              <TextField
                size="small"
                type="number"
                label="Seconds"
                value={selected.end.s}
                onChange={(e) => update(selected.id, { end: { type: "time", s: Math.max(0, Number(e.target.value) || 0) } })}
                inputProps={{ min: 0, step: 0.1 }}
                sx={{ width: 140 }}
              />
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="outlined" onClick={startPreview} disabled={previewing} sx={{ textTransform: "none" }}>
              Preview this hotspot
            </Button>
            <Button size="small" color="error" onClick={() => remove(selected.id)} sx={{ textTransform: "none" }}>
              Delete
            </Button>
          </Box>
        </>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={narrow}
      aria-labelledby="hotspot-editor-title"
      slotProps={{ paper: { sx: narrow ? undefined : { height: "calc(100% - 64px)" } } }}
    >
      <DialogTitle id="hotspot-editor-title" sx={{ py: 1.5, fontSize: 16, fontWeight: 700 }}>
        Hotspots · {scene.title}
      </DialogTitle>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, borderTop: "1px solid", borderBottom: "1px solid", borderColor: "grey.300", flexWrap: "wrap" }}>
        <ToggleButtonGroup size="small" exclusive value={tool} onChange={(_, v) => v && chooseTool(v)} aria-label="Hotspot shape">
          {(["box", "ring", "arrow"] as const).map((s) => (
            <ToggleButton key={s} value={s} sx={{ textTransform: "none", px: 1.5 }}>
              {SHAPE_LABEL[s]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormControlLabel
          control={<Switch size="small" checked={spotlightTool} onChange={(e) => toggleSpotlight(e.target.checked)} />}
          label={<Typography sx={{ fontSize: 13 }}>Spotlight</Typography>}
        />
        <Typography sx={{ fontSize: 12, color: "text.secondary", ml: "auto" }}>
          {drafts.length} hotspot{drafts.length === 1 ? "" : "s"}
        </Typography>
      </Box>
      <DialogContent
        sx={{ p: 0, display: "flex", flexDirection: narrow ? "column" : "row", minHeight: 0, overflow: narrow ? "auto" : "hidden", outline: "none" }}
        onKeyDown={onKeyDown}
        tabIndex={-1}
      >
        {canvasArea}
        {sidePanel}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSave(drafts, image.hash)} sx={{ textTransform: "none" }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HotspotEditor;
