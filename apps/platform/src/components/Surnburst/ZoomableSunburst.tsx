import { useLayoutEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Box, IconButton } from "@mui/material";
import {
  faArrowRotateLeft,
  faCompress,
  faDownload,
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
import { useZoom } from "./useZoom";
import { PRIORITISATION_COLORS } from "../GeneEnrichmentAnalysis/utils/colorPalettes";

export default function ZoomableSunburst({
  data,
  width = 200,
  height = 1000,
  colors = PRIORITISATION_COLORS,
  centerLabel = true,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif",
}: ZoomableSunburstProps) {
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState<PartitionNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Use zoom hook for all zoom/pan functionality
  const {
    gRef,
    svgRef,
    panState,
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleZoomIn,
    handleZoomOut,
    handleReset,
  } = useZoom();

  // Custom mouse move to track tooltip position
  const customHandleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    handleMouseMove(e);
  }, [handleMouseMove]);

  const radius = Math.min(width, height) / 2 / 1.5;

  // Use custom hooks
  const { root, nodes } = useSunburstPartition(data);
  const arc = useSunburstArc(radius);
  const { focus, handleClick } = useSunburstFocus(root);
  const colorMap = useSunburstColorMap(root, colors);

  // Reset hierarchy to top level
  const handleHierarchyReset = useCallback(() => {
    handleClick(root);
  }, [handleClick, root]);

  // Download sunburst as PNG
  const handleDownloadPng = useCallback(() => {
    const svgElement = svgRef.current;
    const gElement = gRef.current;
    if (!svgElement || !gElement) return;

    // Get the bounding box of the g element
    const bbox = (gElement as any).getBBox();
    const padding = 20;
    const scale = 2;

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.width = (bbox.width + padding * 2) * scale;
    canvas.height = (bbox.height + padding * 2) * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, bbox.width + padding * 2, bbox.height + padding * 2);

    // Clone SVG and set viewBox to just the content
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
    clonedSvg.setAttribute("width", String(bbox.width));
    clonedSvg.setAttribute("height", String(bbox.height));

    // Serialize and create image
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, bbox.width, bbox.height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          const pngUrl = URL.createObjectURL(pngBlob);
          const link = document.createElement("a");
          link.download = "sunburst.png";
          link.href = pngUrl;
          link.click();
          URL.revokeObjectURL(pngUrl);
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    };
    img.src = url;
  }, [svgRef, gRef]);

  const active = focus ?? root;

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
      onMouseMove={customHandleMouseMove}
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
        <IconButton size="small" onClick={handleHierarchyReset} title="Reset to top level">
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
            transformOrigin: "0 0",
            transformBox: "view-box",
            transform: `translate(0px, 0px) scale(1)`,
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
