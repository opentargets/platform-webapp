import React, { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { FONT_FAMILY, MONO_FAMILY, OT_COLORS } from "../layout";
import type { FigureAsset, PlacedTable } from "../types";
import { assetSrc } from "./nodeMeta";

/** 1in = 96 CSS px; 1pt = 4/3 px. Previews lay out at print size, then scale down. */
export const PX_PER_IN = 96;
export const PX_PER_PT = 96 / 72;
export const PX_PER_MM = 96 / 25.4;

/** Renders children at a fixed design size, scaled to `width` px. */
export const ScaledBox: React.FC<{
  designWidth: number;
  designHeight: number;
  width: number;
  children: ReactNode;
  sx?: object;
}> = ({ designWidth, designHeight, width, children, sx }) => {
  const scale = width / designWidth;
  return (
    <Box
      sx={{
        width,
        height: designHeight * scale,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
        ...sx,
      }}
    >
      <Box
        sx={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

/** Tracks an element's content width (for the main slide preview). */
export const useElementWidth = <T extends HTMLElement>(): [React.RefObject<T>, number] => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (prev === w ? prev : w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

/**
 * A figure asset as an <img> (svg through a data URL), or a titled placeholder when missing.
 * `fill`: fit inside the parent box (slides); otherwise full width at the asset's aspect (paper).
 */
export const FigureView: React.FC<{
  asset?: FigureAsset;
  title: string;
  caption?: string;
  alt?: string;
  fill?: boolean;
  scale?: number; // type scale for the placeholder
}> = ({ asset, title, caption, alt, fill, scale = 1 }) => {
  const src = asset ? assetSrc(asset) : undefined;
  if (!asset || asset.kind === "missing" || !src) {
    return (
      <Box
        sx={{
          width: "100%",
          height: fill ? "100%" : undefined,
          aspectRatio: fill ? undefined : "16 / 9",
          border: `${2 * scale}px dashed ${OT_COLORS.border}`,
          bgcolor: "#fafafa",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: `${6 * scale}px`,
          p: `${12 * scale}px`,
          boxSizing: "border-box",
          color: OT_COLORS.muted,
          fontFamily: FONT_FAMILY,
        }}
      >
        <Box sx={{ fontSize: 16 * scale, fontWeight: 700, color: OT_COLORS.text }}>{title}</Box>
        {caption && <Box sx={{ fontSize: 12 * scale }}>{caption}</Box>}
        <Box sx={{ fontSize: 11 * scale, fontFamily: MONO_FAMILY }}>figure not available</Box>
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt || title}
      sx={
        fill
          ? { width: "100%", height: "100%", objectFit: "contain", display: "block" }
          : {
              width: "100%",
              aspectRatio: `${asset.width || 16} / ${asset.height || 9}`,
              objectFit: "contain",
              display: "block",
            }
      }
    />
  );
};

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

/** Native HTML table in the OT export style (header #e3f0fa / #1e6ba8). */
export const TableView: React.FC<{ table: PlacedTable; fontPx: number; maxCellChars?: number }> = ({
  table,
  fontPx,
  maxCellChars = 60,
}) => (
  <Box
    component="table"
    sx={{
      width: "100%",
      borderCollapse: "collapse",
      fontFamily: FONT_FAMILY,
      fontSize: fontPx,
      color: OT_COLORS.text,
      tableLayout: "auto",
      "& th, & td": {
        border: `1px solid ${OT_COLORS.border}`,
        padding: `${fontPx * 0.3}px ${fontPx * 0.5}px`,
        textAlign: "left",
        verticalAlign: "top",
        overflowWrap: "anywhere",
      },
      "& th": { bgcolor: OT_COLORS.primaryLight, color: OT_COLORS.primaryDark, fontWeight: 700 },
    }}
  >
    <thead>
      <tr>
        {table.data.columns.map((c) => (
          <th key={c.key}>{c.label}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {table.data.rows.map((row, i) => (
        <tr key={i}>
          {table.data.columns.map((c) => {
            const text = cellText(row[c.key]);
            return (
              <td key={c.key}>{text.length > maxCellChars ? `${text.slice(0, maxCellChars - 1)}…` : text}</td>
            );
          })}
        </tr>
      ))}
    </tbody>
  </Box>
);

/** Rich-text HTML from renderRichTextHTML (schema-sanitised). */
export const RichHtml: React.FC<{ html: string; sx?: object }> = ({ html, sx }) => (
  <Box
    sx={{ "& p": { m: 0, mb: "0.5em" }, "& p:last-child": { mb: 0 }, "& ul, & ol": { m: 0, pl: "1.4em" }, ...sx }}
    dangerouslySetInnerHTML={{ __html: html }}
  />
);
