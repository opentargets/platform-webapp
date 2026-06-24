import {
  faArrowRotateLeft,
  faCompress,
  faDownload,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, IconButton, Typography } from "@mui/material";
// @ts-expect-error - Plotly types are complex
import Plotly from "plotly.js-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// @ts-expect-error
import createPlotlyComponent from "react-plotly.js/factory";
import type { GseaResult } from "../api/gseaApi";
import {
  mapToPrioritizationColor,
  PRIORITISATION_COLORS,
  ROOT_NODE_COLOR,
} from "../utils/colorPalettes";
import { buildPathwayHierarchy, getEffectiveRootPathways } from "../utils/pathwayHierarchy";

const Plot = createPlotlyComponent(Plotly);

interface PlotlySunburstChartProps {
  results: GseaResult[];
  height?: number;
}

interface SunburstData {
  ids: string[];
  labels: string[];
  parents: string[];
  values: number[];
  customdata: any[];
  marker: {
    colors: string[];
    line: { color: string; width: number };
  };
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.15;

function PlotlySunburstChart({ results, height = 600 }: PlotlySunburstChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<any>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [sunburstLevel, setSunburstLevel] = useState("");
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Attach wheel listener in capture phase so it fires before Plotly sees the event
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
    };
    el.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && !e.shiftKey) return; // middle click or shift+click to pan
    e.preventDefault();
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP * 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP * 2));
  }, []);

  const handleResetChart = useCallback(() => {
    setSunburstLevel("");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleDownloadPng = useCallback(() => {
    const plotEl = plotRef.current?.el;
    if (!plotEl) return;
    Plotly.toImage(plotEl, { format: "png", width: 1200, height: 1200, scale: 2 }).then(
      (dataUrl: string) => {
        const link = document.createElement("a");
        link.download = "sunburst-pathways.png";
        link.href = dataUrl;
        link.click();
      }
    );
  }, []);
  // Build sunburst data
  const sunburstData = useMemo(() => {
    if (results.length === 0) return null;

    const { pathwayMap, childrenMap } = buildPathwayHierarchy(results);
    const rootPathways = getEffectiveRootPathways(results);

    // Collect all NES values for color scaling
    const nesValues = results.map((r) => r.NES || 0);
    const minNES = Math.min(...nesValues);
    const maxNES = Math.max(...nesValues);

    const data: SunburstData = {
      ids: [],
      labels: [],
      parents: [],
      values: [],
      customdata: [],
      marker: {
        colors: [],
        line: { color: "#fff", width: 1 },
      },
    };

    // Add root node
    data.ids.push("root");
    data.labels.push("All Pathways");
    data.parents.push("");
    data.values.push(0); // Will be calculated as sum of children with remainder mode
    data.customdata.push({ type: "root", count: results.length });
    data.marker.colors.push(ROOT_NODE_COLOR);

    const processedIds = new Set<string>();

    // Add pathway node - using a constant value of 1 for leaf nodes
    // With branchvalues="remainder", parent values are added to children sum
    const addPathwayNode = (pathway: GseaResult, parentId: string): number => {
      const id = pathway.ID || "";
      if (!id || processedIds.has(id)) return 0;
      processedIds.add(id);

      const nes = pathway.NES || 0;
      const pValue = pathway["p-value"] || 1;
      const genes = pathway["Leading edge genes"] || "";
      const geneList = genes
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

      // Get children first to determine if this is a leaf
      const children = childrenMap.get(id) || [];
      const childPathways = children
        .map((childId) => pathwayMap.get(childId))
        .filter(Boolean) as GseaResult[];

      // For leaf nodes, use 1 as value
      // For parent nodes, value will be added to children's sum (remainder mode)
      const isLeaf = childPathways.length === 0;
      const value = isLeaf ? 1 : 0;

      data.ids.push(id);
      data.labels.push(pathway.Pathway || id);
      data.parents.push(parentId);
      data.values.push(value);
      data.customdata.push({
        type: "pathway",
        id,
        pathway: pathway.Pathway,
        nes,
        pValue,
        fdr: pathway.FDR,
        pathwaySize: pathway["Pathway size"],
        matchedGenes: pathway["Number of input genes"],
        genes: geneList,
      });
      data.marker.colors.push(mapToPrioritizationColor(nes, minNES, maxNES));

      // Add children
      childPathways.forEach((childPathway) => {
        addPathwayNode(childPathway, id);
      });

      return value;
    };

    // Add root pathways
    rootPathways.forEach((pathway) => {
      addPathwayNode(pathway, "root");
    });

    return data;
  }, [results]);

  if (!sunburstData || results.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No pathways to display.</Typography>
      </Box>
    );
  }

  // Check if hierarchy data exists
  const hasHierarchy = results.some((r) => r["Parent pathway"]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {!hasHierarchy && (
        <Box sx={{ p: 1, backgroundColor: "warning.light", borderRadius: 1, mb: 1 }}>
          <Typography variant="body2" color="warning.dark">
            No hierarchy data available. Displaying flat structure.
          </Typography>
        </Box>
      )}
      {/* Zoom controls */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
          backgroundColor: "background.paper",
          borderRadius: 1,
          boxShadow: 1,
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <IconButton size="small" onClick={handleResetChart} title="Reset chart">
          <FontAwesomeIcon icon={faArrowRotateLeft} fontSize="0.85rem" />
        </IconButton>
        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />
        <IconButton size="small" onClick={handleZoomIn} title="Zoom in">
          <FontAwesomeIcon icon={faMagnifyingGlassPlus} fontSize="0.85rem" />
        </IconButton>
        <IconButton size="small" onClick={handleZoomOut} title="Zoom out">
          <FontAwesomeIcon icon={faMagnifyingGlassMinus} fontSize="0.85rem" />
        </IconButton>
        <IconButton size="small" onClick={handleReset} title="Reset zoom">
          <FontAwesomeIcon icon={faCompress} fontSize="0.85rem" />
        </IconButton>
        <Box sx={{ borderTop: "1px solid", borderColor: "divider" }} />
        <IconButton size="small" onClick={handleDownloadPng} title="Download PNG">
          <FontAwesomeIcon icon={faDownload} fontSize="0.85rem" />
        </IconButton>
      </Box>
      {zoom !== 1 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ position: "absolute", bottom: 8, right: 8, zIndex: 10 }}
        >
          {Math.round(zoom * 100)}%
        </Typography>
      )}
      {/* Zoomable container */}
      <Box
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        sx={{
          flex: 1,
          minHeight: height,
          overflow: "hidden",
          cursor: isPanning.current ? "grabbing" : "default",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <Plot
            ref={plotRef}
            data={[
              {
                type: "sunburst",
                ids: sunburstData.ids,
                labels: sunburstData.labels,
                parents: sunburstData.parents,
                values: sunburstData.values,
                customdata: sunburstData.customdata,
                marker: sunburstData.marker,
                branchvalues: "remainder",
                level: sunburstLevel || undefined,
                hovertemplate:
                  "<b>%{label}</b><br>" +
                  "NES: %{customdata.nes:.3f}<br>" +
                  "p-value: %{customdata.pValue:.2e}<br>" +
                  "FDR: %{customdata.fdr:.2e}<br>" +
                  "Pathway size: %{customdata.pathwaySize}<br>" +
                  "Overlap genes: %{customdata.matchedGenes}<br>" +
                  "<extra></extra>",
                textinfo: "label",
                insidetextorientation: "radial",
              },
            ]}
            layout={{
              margin: { l: 0, r: 0, t: 10, b: 10 },
              sunburstcolorway: PRIORITISATION_COLORS,
              extendsunburstcolors: true,
            }}
            config={{
              displayModeBar: false,
              displaylogo: false,
              responsive: true,
            }}
            style={{ width: "100%", height: "100%" }}
            useResizeHandler
            onSunburstClick={(e: any) => {
              const point = e.points?.[0];
              if (point) {
                setSunburstLevel(point.id || "");
              }
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default PlotlySunburstChart;
