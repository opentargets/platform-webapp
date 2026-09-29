import React, { ReactNode, useMemo } from "react";
import { Box, Checkbox, Chip, FormControlLabel, Typography } from "@mui/material";
import type { ExportTarget } from "../types";
import { mp4Supported } from "../video/recorder";

// ---------- thumbnail sketches (plain CSS boxes) ----------

const bar = (width: string, height = 4, color = "#cfd8dc") => (
  <Box sx={{ width, height, bgcolor: color, borderRadius: "1px", flexShrink: 0 }} />
);

const SlidesSketch = () => (
  <Box sx={{ width: 112, aspectRatio: "16 / 9", border: "1px solid", borderColor: "grey.400", bgcolor: "#fff", p: "6px", display: "flex", flexDirection: "column", gap: "3px", boxSizing: "border-box" }}>
    {bar("60%", 5, "#616161")}
    {bar("100%", 1, "#3489ca")}
    <Box sx={{ flex: 1, display: "flex", gap: "4px", mt: "2px" }}>
      <Box sx={{ flex: 1, bgcolor: "#e3f0fa", border: "1px solid #7bb3de" }} />
      <Box sx={{ width: "24%", display: "flex", flexDirection: "column", gap: "3px" }}>
        {bar("100%", 3)}
        {bar("80%", 3)}
        {bar("90%", 3)}
      </Box>
    </Box>
    {bar("40%", 2)}
  </Box>
);

const PaperSketch = () => (
  <Box sx={{ width: 64, aspectRatio: "210 / 297", border: "1px solid", borderColor: "grey.400", bgcolor: "#fff", p: "5px", display: "flex", flexDirection: "column", gap: "3px", boxSizing: "border-box" }}>
    {bar("80%", 4, "#616161")}
    {bar("50%", 2)}
    <Box sx={{ flex: 1, display: "flex", gap: "4px", mt: "2px" }}>
      {[0, 1].map((c) => (
        <Box key={c} sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          {bar("100%", 2)}
          {bar("100%", 2)}
          {c === 0 ? <Box sx={{ height: 14, bgcolor: "#e3f0fa", border: "1px solid #7bb3de" }} /> : bar("90%", 2)}
          {bar("100%", 2)}
          {bar("70%", 2)}
        </Box>
      ))}
    </Box>
  </Box>
);

const WorkingSketch = () => (
  <Box sx={{ width: 34, aspectRatio: "210 / 297", border: "1px solid", borderColor: "grey.400", bgcolor: "#fff", p: "3px", display: "flex", flexDirection: "column", gap: "2px", boxSizing: "border-box" }}>
    {bar("100%", 5, "#e3f0fa")}
    {bar("90%", 2)}
    {bar("100%", 5, "#e3f0fa")}
    {bar("70%", 2)}
  </Box>
);

const DataSketch = () => (
  <Box sx={{ width: 40, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px" }}>
    {Array.from({ length: 9 }, (_, i) => (
      <Box key={i} sx={{ height: 6, bgcolor: i < 3 ? "#7bb3de" : "#e3f0fa" }} />
    ))}
  </Box>
);

const VideoFrameSketch: React.FC<{ width: number; aspect: string; hotspot: { left: string; top: string; w: string; h: string } }> = ({ width, aspect, hotspot }) => (
  <Box sx={{ width, aspectRatio: aspect, border: "1px solid", borderColor: "grey.400", bgcolor: "#fff", p: "4px", display: "flex", flexDirection: "column", gap: "3px", boxSizing: "border-box", position: "relative" }}>
    {bar("70%", 4, "#616161")}
    <Box sx={{ flex: 1, bgcolor: "#e3f0fa", border: "1px solid #7bb3de", position: "relative" }}>
      <Box sx={{ position: "absolute", left: hotspot.left, top: hotspot.top, width: hotspot.w, height: hotspot.h, border: "2px solid", borderColor: "secondary.main", borderRadius: "2px" }} />
    </Box>
    <Box sx={{ height: 6, bgcolor: "rgba(0,0,0,0.72)", borderRadius: "1px", mx: "10%" }} />
  </Box>
);

const VideoSketch = () => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
    <VideoFrameSketch width={42} aspect="9 / 16" hotspot={{ left: "30%", top: "25%", w: "40%", h: "30%" }} />
    <VideoFrameSketch width={112} aspect="16 / 9" hotspot={{ left: "55%", top: "20%", w: "25%", h: "45%" }} />
  </Box>
);

// ---------- cards ----------

interface TargetCardProps {
  target: ExportTarget;
  selected: boolean;
  onSelect: (t: ExportTarget) => void;
  title: string;
  description: string;
  formats: string[];
  sketch: ReactNode;
  large?: boolean;
  badge?: string; // e.g. "new"
  sx?: object;
  children?: ReactNode;
}

const TargetCard: React.FC<TargetCardProps> = ({
  target,
  selected,
  onSelect,
  title,
  description,
  formats,
  sketch,
  large,
  badge,
  sx,
  children,
}) => (
  <Box
    role="radio"
    aria-checked={selected}
    tabIndex={0}
    onClick={() => onSelect(target)}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelect(target);
      }
    }}
    sx={{
      position: "relative",
      border: "2px solid",
      borderColor: selected ? "primary.main" : "grey.300",
      borderRadius: "4px",
      bgcolor: selected ? "#f5f9fd" : "#fff",
      p: large ? 2 : 1.5,
      cursor: "pointer",
      display: "flex",
      flexDirection: large ? "column" : "row",
      alignItems: large ? "stretch" : "center",
      gap: large ? 1.5 : 1.5,
      "&:hover": { borderColor: selected ? "primary.main" : "grey.500" },
      "&:focus-visible": { outline: "2px solid", outlineColor: "primary.dark", outlineOffset: 2 },
      ...sx,
    }}
  >
    {selected && (
      <Chip
        label="selected"
        size="small"
        color="primary"
        sx={{ position: "absolute", top: 8, right: 8, height: 20, fontSize: 11 }}
      />
    )}
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "grey.100",
        borderRadius: "2px",
        height: large ? 92 : 56,
        width: large ? "auto" : 64,
        flexShrink: 0,
      }}
    >
      {sketch}
    </Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, pr: selected ? 9 : 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: large ? 16 : 14 }}>{title}</Typography>
        {badge && (
          <Chip
            label={badge}
            size="small"
            sx={{ height: 18, fontSize: 10, bgcolor: "grey.100", border: "1px solid", borderColor: "grey.400", color: "text.secondary" }}
          />
        )}
      </Box>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.25 }}>{description}</Typography>
      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
        {formats.map((f) => (
          <Chip
            key={f}
            label={f}
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: 11, fontFamily: "'Roboto Mono', monospace" }}
          />
        ))}
      </Box>
      {children}
    </Box>
  </Box>
);

interface TargetStepProps {
  target: ExportTarget;
  onSelect: (t: ExportTarget) => void;
  includeImages: boolean;
  onIncludeImagesChange: (value: boolean) => void;
}

export const TargetStep: React.FC<TargetStepProps> = ({ target, onSelect, includeImages, onIncludeImagesChange }) => {
  const videoFormats = useMemo(() => (mp4Supported() ? ["MP4", "WEBM", "SRT"] : ["WEBM", "SRT"]), []);
  const wide = { gridColumn: { xs: "auto", md: "span 2" } };
  const half = { gridColumn: { xs: "auto", md: "span 3" } };
  return (
    <Box
      role="radiogroup"
      aria-label="Export target"
      sx={{ p: { xs: 2, sm: 3 }, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(6, minmax(0, 1fr))" }, gap: 2 }}
    >
      <TargetCard
        large
        target="slides"
        selected={target === "slides"}
        onSelect={onSelect}
        title="Presentation slides"
        description="One slide per figure, titled with its takeaway; prose becomes speaker notes."
        formats={["PPTX", "PDF"]}
        sketch={<SlidesSketch />}
        sx={wide}
      />
      <TargetCard
        large
        target="paper"
        selected={target === "paper"}
        onSelect={onSelect}
        title="Publication paper"
        description="Numbered figures and tables with full captions, methods and references."
        formats={["PDF", "DOCX", "Markdown"]}
        sketch={<PaperSketch />}
        sx={wide}
      />
      <TargetCard
        large
        target="video"
        selected={target === "video"}
        onSelect={onSelect}
        title="Social video"
        badge="new"
        description="Figures become scenes, text becomes narration, and hotspots draw the eye. 9:16 or 16:9, up to 90 s."
        formats={videoFormats}
        sketch={<VideoSketch />}
        sx={wide}
      />
      <TargetCard
        target="working"
        selected={target === "working"}
        onSelect={onSelect}
        title="Working PDF"
        description="The drawer as it is, every block expanded."
        formats={["PDF"]}
        sketch={<WorkingSketch />}
        sx={half}
      />
      <TargetCard
        target="data"
        selected={target === "data"}
        onSelect={onSelect}
        title="Data & provenance"
        description="Report JSON plus a CSV per table."
        formats={["JSON", "CSV zip"]}
        sketch={<DataSketch />}
        sx={half}
      >
        <FormControlLabel
          onClick={(e) => e.stopPropagation()}
          control={
            <Checkbox
              size="small"
              checked={includeImages}
              onChange={(e) => onIncludeImagesChange(e.target.checked)}
            />
          }
          label={<Typography sx={{ fontSize: 12 }}>Include images</Typography>}
          sx={{ ml: -0.5, mt: 0.5, mb: -0.5 }}
        />
      </TargetCard>
    </Box>
  );
};

export default TargetStep;
