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

  // Download sunburst as SVG
  const handleDownloadSvg = useCallback(() => {
    const svgElement = svgRef.current;
    const gElement = gRef.current;
    if (!svgElement || !gElement) return;

    // Get the bounding box of the g element. Arc labels can overhang further
    // on one side than the other, so the raw bbox isn't centered on the
    // chart's true center (0,0) — cropping to it directly would make the
    // sunburst look off-center. Instead, expand symmetrically around the
    // origin so (0,0) stays at the exact center of the export.
    const bbox = (gElement as any).getBBox();
    const padding = 20;
    const halfWidth = Math.max(Math.abs(bbox.x), Math.abs(bbox.x + bbox.width)) + padding;
    const halfHeight = Math.max(Math.abs(bbox.y), Math.abs(bbox.y + bbox.height)) + padding;
    const exportWidth = halfWidth * 2;
    const exportHeight = halfHeight * 2;

    // Clone SVG and set viewBox centered on the origin
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute(
      "viewBox",
      `${-halfWidth} ${-halfHeight} ${exportWidth} ${exportHeight}`
    );
    clonedSvg.setAttribute("width", String(exportWidth));
    clonedSvg.setAttribute("height", String(exportHeight));
    // The SVG normally inherits its font from the surrounding page via CSS,
    // which is lost once it's serialized on its own — set it explicitly.
    clonedSvg.setAttribute("font-family", fontFamily);

    // White background so the export isn't transparent
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    background.setAttribute("x", String(-halfWidth));
    background.setAttribute("y", String(-halfHeight));
    background.setAttribute("width", String(exportWidth));
    background.setAttribute("height", String(exportHeight));
    background.setAttribute("fill", "white");
    clonedSvg.insertBefore(background, clonedSvg.firstChild);

    // Undo the current pan/zoom on the cloned content so the full plot is
    // exported, not just whatever portion is currently visible on screen.
    const clonedG = clonedSvg.querySelector("g");
    if (clonedG) {
      (clonedG as SVGGElement).style.transform = "translate(0px, 0px) scale(1)";
    }

    // Serialize and download
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clonedSvg);
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.download = "sunburst.svg";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [svgRef, gRef, fontFamily]);

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
      <Box
        sx={{
          position: "relative",
          top: -16,
          zIndex: 10,
          backgroundColor: "background.paper",
          flexShrink: 0,
        }}
      >
        <SunburstBreadcrumb
          trail={displayChain}
          onNavigate={handleClick}
          onHover={(node, e) => { setHovered(node); setMousePos({ x: e.clientX, y: e.clientY }); }}
          onHoverEnd={() => setHovered(null)}
        />
      </Box>

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
        <IconButton size="small" onClick={handleDownloadSvg} title="Download SVG">
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
