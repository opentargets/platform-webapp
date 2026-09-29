import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Chip, FormControlLabel, Switch, Typography, useMediaQuery, useTheme } from "@mui/material";
import type { Report } from "../../../../types/report";
import type {
  BlockExportOverride,
  DeepPartial,
  ExportDocument,
  ExportPlan,
  ExportSettings,
  ExportWarning,
  SlideUnit,
} from "../types";
import { BlockRoleRow } from "./BlockRoleRow";
import { SlidePreview } from "./SlidePreview";
import { rowDomId, widgetAvatarText } from "./nodeMeta";
import { useElementWidth } from "./previewParts";
import type { MappedTarget } from "./useExportFlow";

const FILMSTRIP_WIDTH = 150;
const MAX_PREVIEW_WIDTH = 880;

export const monoLabelSx = {
  fontFamily: "'Roboto Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "text.secondary",
} as const;

const unitNodeId = (unit: SlideUnit): string | undefined => ("nodeId" in unit ? unit.nodeId : undefined);

interface SlidesMappingStepProps {
  report: Report;
  doc: ExportDocument;
  plan: ExportPlan;
  settings: ExportSettings;
  warningsByNode: Map<string, ExportWarning[]>;
  updateSettings: (patch: DeepPartial<ExportSettings>) => void;
  setOverride: (target: MappedTarget, nodeId: string, patch: DeepPartial<BlockExportOverride> | undefined) => void;
  onRetry: () => void;
  retrying: boolean;
}

export const SlidesMappingStep: React.FC<SlidesMappingStepProps> = ({
  report,
  doc,
  plan,
  settings,
  warningsByNode,
  updateSettings,
  setOverride,
  onRetry,
  retrying,
}) => {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const slides = plan.units as SlideUnit[];
  const { aspect } = settings.slides;
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [previewRef, previewWidth] = useElementWidth<HTMLDivElement>();
  const filmstripRef = useRef<HTMLDivElement>(null);

  // Keep a valid selection as the plan changes
  const selectedIndex = Math.max(
    0,
    slides.findIndex((s) => s.id === selectedSlideId)
  );
  const selectedSlide = slides[selectedIndex];
  const highlightedNodeId = selectedNodeId ?? (selectedSlide ? unitNodeId(selectedSlide) : undefined) ?? null;

  const selectSlide = useCallback((unit: SlideUnit) => {
    setSelectedSlideId(unit.id);
    const nodeId = unitNodeId(unit);
    setSelectedNodeId(nodeId ?? null);
    if (nodeId) document.getElementById(rowDomId(nodeId))?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const slidesRef = useRef(slides);
  slidesRef.current = slides;
  const selectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    const unit = slidesRef.current.find((s) => unitNodeId(s) === nodeId);
    if (unit) setSelectedSlideId(unit.id);
  }, []);

  // Scroll the filmstrip to the selected slide
  useEffect(() => {
    if (!selectedSlide) return;
    filmstripRef.current
      ?.querySelector<HTMLElement>(`[data-slide-id="${CSS.escape(selectedSlide.id)}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedSlide]);

  const onOverride = useCallback(
    (nodeId: string, patch: DeepPartial<BlockExportOverride> | undefined) => setOverride("slides", nodeId, patch),
    [setOverride]
  );

  const avatars = useMemo(() => {
    const out: Record<string, string | undefined> = {};
    doc.nodes.forEach((n) => {
      out[n.id] = widgetAvatarText(report, n.id);
    });
    return out;
  }, [doc, report]);

  const toggle = (key: "titleSlide" | "chapterDividers" | "methodsAppendix", label: string) => (
    <FormControlLabel
      key={key}
      control={
        <Switch
          size="small"
          checked={settings.slides[key]}
          onChange={(e) => updateSettings({ slides: { [key]: e.target.checked } })}
        />
      }
      label={<Typography sx={{ fontSize: 12 }}>{label}</Typography>}
      sx={{ mr: 1.5, ml: 0 }}
    />
  );

  const mainWidth = Math.min(Math.max(previewWidth, 200), MAX_PREVIEW_WIDTH);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "400px minmax(0,1fr)",
        gridTemplateRows: isNarrow ? "auto auto" : "minmax(0,1fr)",
        flex: 1,
        height: isNarrow ? "auto" : "100%",
        minHeight: 0,
      }}
    >
      {/* Left: blocks → roles */}
      <Box
        sx={{
          borderRight: isNarrow ? 0 : "1px solid",
          borderBottom: isNarrow ? "1px solid" : 0,
          borderColor: "grey.300",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          bgcolor: "grey.50",
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "grey.300", display: "flex", flexWrap: "wrap" }}>
          {toggle("titleSlide", "Title slide")}
          {toggle("chapterDividers", "Chapter dividers")}
          {toggle("methodsAppendix", "Appendix: methods")}
        </Box>
        <Box sx={{ ...monoLabelSx, px: 2, pt: 1.5, pb: 1 }}>Blocks → slides</Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: 2,
            pb: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {doc.nodes.map((node) => (
            <BlockRoleRow
              key={node.id}
              target="slides"
              node={node}
              effective={plan.roles[node.id]}
              override={settings.overrides[node.id]?.slides}
              warnings={warningsByNode.get(node.id) ?? EMPTY}
              avatarText={avatars[node.id]}
              selected={highlightedNodeId === node.id}
              onSelect={selectNode}
              onOverride={onOverride}
              onRetry={onRetry}
              retrying={retrying}
            />
          ))}
        </Box>
      </Box>

      {/* Right: preview */}
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 2, py: 1, borderBottom: "1px solid", borderColor: "grey.300" }}>
          <Box sx={monoLabelSx}>
            Preview · {slides.length} slide{slides.length === 1 ? "" : "s"}
          </Box>
          <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
            {(["16:9", "4:3"] as const).map((a) => (
              <Chip
                key={a}
                label={a}
                size="small"
                color={aspect === a ? "primary" : "default"}
                variant={aspect === a ? "filled" : "outlined"}
                onClick={() => updateSettings({ slides: { aspect: a } })}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", bgcolor: "grey.100", p: 2 }}>
          <Box ref={previewRef} sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
            {selectedSlide ? (
              <Box sx={{ boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
                <SlidePreview
                  unit={selectedSlide}
                  aspect={aspect}
                  index={selectedIndex}
                  total={slides.length}
                  dataRelease={plan.dataRelease}
                  width={mainWidth}
                />
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 6 }}>
                Nothing to show — every block is omitted.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Filmstrip */}
        <Box
          ref={filmstripRef}
          role="listbox"
          aria-label="Slides"
          sx={{
            display: "flex",
            gap: 1,
            overflowX: "auto",
            px: 2,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "grey.300",
            flexShrink: 0,
          }}
        >
          {slides.map((unit, i) => {
            const active = unit.id === selectedSlide?.id;
            const linked = !active && highlightedNodeId && unitNodeId(unit) === highlightedNodeId;
            return (
              <Box
                key={unit.id}
                data-slide-id={unit.id}
                role="option"
                aria-selected={active}
                tabIndex={0}
                onClick={() => selectSlide(unit)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectSlide(unit);
                  }
                }}
                sx={{ flexShrink: 0, cursor: "pointer", textAlign: "center" }}
              >
                <Box
                  sx={{
                    outline: "2px solid",
                    outlineColor: active ? "primary.main" : linked ? "primary.light" : "transparent",
                    outlineOffset: 1,
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                    // Thumbnails are static; skip pointer events inside them
                    "& *": { pointerEvents: "none" },
                  }}
                >
                  <SlidePreview
                    unit={unit}
                    aspect={aspect}
                    index={i}
                    total={slides.length}
                    dataRelease={plan.dataRelease}
                    width={FILMSTRIP_WIDTH}
                  />
                </Box>
                <Typography sx={{ fontSize: 10, fontFamily: "'Roboto Mono', monospace", color: "text.secondary", mt: 0.5 }}>
                  {i + 1}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

const EMPTY: ExportWarning[] = [];

export default SlidesMappingStep;
