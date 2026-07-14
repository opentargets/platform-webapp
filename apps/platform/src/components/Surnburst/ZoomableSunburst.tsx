import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import * as d3 from "d3";
import { Box, IconButton } from "@mui/material";
import {
  faArrowRotateLeft,
  faCompress,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ZoomableSunburstProps, PartitionNode } from "./types";
import {
  useSunburstPartition,
  useSunburstArc,
  useSunburstFocus,
  useSunburstColorMap,
} from "./hooks";
import { getBreadcrumbNodes } from "./utils";
import { SunburstArcs } from "./SunburstArcs";
import { SunburstLabels } from "./SunburstLabels";
import { SunburstCenter } from "./SunburstCenter";
import { SunburstBreadcrumb } from "./SunburstBreadcrumb";
import { SunburstTooltip } from "./SunburstTooltip";
import { PRIORITISATION_COLORS } from "../GeneEnrichmentAnalysis/utils/colorPalettes";


const MIN_ZOOM = 0.5;
const MAX_ZOOM = 20;
const ZOOM_STEP = 0.15;

export default function ZoomableSunburst({
  data,
  width = 200,
  height = 1000,
  colors = PRIORITISATION_COLORS,
  centerLabel = true,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif",
}: ZoomableSunburstProps) {
  const gRef = useRef(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState<PartitionNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const radius = Math.min(width, height) / 2 / 1.5;

  // Use custom hooks
  const { root, nodes } = useSunburstPartition(data);
  const arc = useSunburstArc(radius);
  const { focus, handleClick } = useSunburstFocus(root);
  const colorMap = useSunburstColorMap(root, colors);

  const active = focus ?? root;

  // Scroll to zoom - attach in capture phase so it fires before any other listeners
  useEffect(() => {
    const el = svgRef.current;
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

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 1 && !e.shiftKey) return; // middle click or shift+click to pan
    e.preventDefault();
    isPanning.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP * 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP * 2));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Animation
  useLayoutEffect(() => {
    const g = d3.select(gRef.current) as any;
    const t = g.transition().duration(650).ease(d3.easeCubicInOut);

    // Bind data to path elements and animate
    (g.selectAll("path.arc") as any)
      .data(nodes, (_: any, i: number) => i)
      .transition(t)
      .tween("data", function (d: PartitionNode) {
        if (!d || !d.current) return () => {};
        const i = d3.interpolate(d.current, d.target ?? d.current);
        return (time: number) => {
          d.current = i(time);
        };
      })
      .attrTween("d", (d: PartitionNode) => {
        if (!d || !d.current) return () => "";
        return () => arc(d.current) ?? "";
      })
      .attr("fill-opacity", (d: PartitionNode) => {
        if (!d) return 0;
        const arcData = d.target ?? d.current;
        return arcData.y1 <= 100 && arcData.y0 >= 1 && arcData.x1 > arcData.x0
          ? 1
          : 0;
      })
      .attr("pointer-events", (d: PartitionNode) => {
        if (!d) return "none";
        const arcData = d.target ?? d.current;
        return arcData.y1 <= 100 && arcData.y0 >= 1 && arcData.x1 > arcData.x0
          ? "auto"
          : "none";
      });

    // Bind data to text elements and animate
    (g.selectAll("text.arc-label") as any)
      .data(nodes, (_: any, i: number) => i)
      .transition(t)
      .attr("fill-opacity", (d: PartitionNode) => {
        if (!d || !d.current) return 0;
        const arcData = d.target ?? d.current;
        return arcData.y1 <= 100 &&
          arcData.y0 >= 1 &&
          (arcData.y1 - arcData.y0) * (arcData.x1 - arcData.x0) > 0.03
          ? 1
          : 0;
      })
      .attrTween("transform", (d: PartitionNode) => {
        if (!d || !d.current) return () => "";
        const i = d3.interpolate(d.current, d.target ?? d.current);
        return (time: number) => {
          const arcData = i(time);
          const x = ((arcData.x0 + arcData.x1) / 2) * (180 / Math.PI);
          const y = ((arcData.y0 + arcData.y1) / 2) * radius;
          return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, nodes, arc, radius]);

  // Compute display values — only reflect active drill-down, not hover
  const displayName = active === root
    ? data.name || ""
    : (active as PartitionNode).data.name;

  const displayChain = getBreadcrumbNodes(active as PartitionNode);

  return (
    <>
      <SunburstTooltip node={hovered} x={mousePos.x} y={mousePos.y} />
      <Box
        ref={containerRef}
        sx={{
        width: "100%",
        height: "100%",
        fontFamily,
        userSelect: "none",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <SunburstBreadcrumb
        trail={displayChain}
        onNavigate={handleClick}
        onHover={(node, e) => { setHovered(node); setMousePos({ x: e.clientX, y: e.clientY }); }}
        onHoverEnd={() => setHovered(null)}
      />

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
        <IconButton size="small" onClick={handleReset} title="Reset">
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
      </Box>

      {zoom !== 1 && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            right: 8,
            zIndex: 10,
            fontSize: "0.75rem",
            color: "text.secondary",
          }}
        >
          {Math.round(zoom * 100)}%
        </Box>
      )}

      <svg
        ref={svgRef}
        viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
        width="100%"
        style={{
          display: "block",
          overflow: "visible",
          cursor: isPanning.current ? "grabbing" : "default",
          flex: 1,
          minHeight: 0,
        }}
      >
        <g
          ref={gRef}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transformBox: "view-box",
            transition: isPanning.current ? "none" : "transform 0.3s ease-out",
          }}
        >
          <SunburstArcs
            nodes={nodes}
            arc={arc}
            colorMap={colorMap}
            onArcClick={handleClick}
            onMouseEnter={setHovered}
            onMouseLeave={() => setHovered(null)}
          />

          <SunburstLabels nodes={nodes} radius={radius} colorMap={colorMap} />

          <SunburstCenter
            radius={radius}
            active={active}
            root={root}
            displayName={displayName}
            centerLabel={centerLabel}
            colorMap={colorMap}
            onZoomOut={() => active.parent && handleClick(active.parent)}
            onMouseEnter={(e) => { setHovered(active as PartitionNode); setMousePos({ x: e.clientX, y: e.clientY }); }}
            onMouseLeave={() => setHovered(null)}
          />
        </g>
      </svg>
    </Box>
    </>
  );
}
