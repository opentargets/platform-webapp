import { useLayoutEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { ZoomableSunburstProps, PartitionNode } from "./types";
import {
  useSunburstPartition,
  useSunburstArc,
  useSunburstFocus,
  useSunburstColorMap,
} from "./hooks";
import { getBreadcrumbTrail } from "./utils";
import { SunburstArcs } from "./SunburstArcs";
import { SunburstLabels } from "./SunburstLabels";
import { SunburstCenter } from "./SunburstCenter";
import { SunburstBreadcrumb } from "./SunburstBreadcrumb";

// Color palette — one hue per top-level branch
const BRANCH_COLORS = [
  "#8f9199", // grey
  "#4f9d4c", // green
  "#5fa8d3", // light blue
  "#e2a323", // amber / gold
  "#e0742a", // orange
  "#3f66a6", // blue
  "#8a5fc9", // purple (extra, if >6 branches)
  "#c9556f", // rose (extra)
];

/**
 * ZoomableSunburst
 * -----------------
 * A D3-powered radial "sunburst" for visualizing hierarchical clustering.
 *
 * Usage:
 *   <ZoomableSunburst data={data} width={760} height={760} />
 *
 * Expected data shape:
 *   {
 *     name: "root",
 *     children: [{ name: "branch1", children: [...] }, ...]
 *   }
 */
export default function ZoomableSunburst({
  data,
  width = 760,
  height = 760,
  colors = BRANCH_COLORS,
  centerLabel = true,
  fontFamily = "system-ui, -apple-system, Segoe UI, sans-serif",
}: ZoomableSunburstProps) {
  const gRef = useRef(null);
  const containerRef = useRef(null);
  const [hovered, setHovered] = useState<PartitionNode | null>(null);

  const radius = Math.min(width, height) / 2 / 1.9;

  // Use custom hooks
  const { root, nodes } = useSunburstPartition(data);
  const arc = useSunburstArc(radius);
  const { focus, handleClick } = useSunburstFocus(root);
  const colorMap = useSunburstColorMap(root, colors);

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
        return arcData.y1 <= 3 && arcData.y0 >= 1 && arcData.x1 > arcData.x0
          ? d.children
            ? 0.9
            : 0.75
          : 0;
      })
      .attr("pointer-events", (d: PartitionNode) => {
        if (!d) return "none";
        const arcData = d.target ?? d.current;
        return arcData.y1 <= 3 && arcData.y0 >= 1 && arcData.x1 > arcData.x0
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
        return arcData.y1 <= 3 &&
          arcData.y0 >= 1 &&
          (arcData.y1 - arcData.y0) * (arcData.x1 - arcData.x0) > 0.035
          ? 1
          : 0;
      })
      .attrTween("transform", (d: PartitionNode) => {
        if (!d || !d.current) return () => "";
        return () => {
          const x = (((d.current.x0 + d.current.x1) / 2) * 180) / Math.PI;
          const y = ((d.current.y0 + d.current.y1) / 2) * radius;
          return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, nodes, arc, radius]);
  // Compute display values
  const displayName = hovered
    ? hovered.data.name
    : active === root
      ? data.name || ""
      : (active as PartitionNode).data.name;

  const displayChain = hovered
    ? getBreadcrumbTrail(hovered)
    : getBreadcrumbTrail(active as PartitionNode);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        maxWidth: "100%",
        fontFamily,
        userSelect: "none",
      }}
    >
      <svg
        viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}
        width="100%"
        height={height}
        style={{ display: "block", overflow: "visible" }}
      >
        <g ref={gRef}>
          <SunburstArcs
            nodes={nodes}
            arc={arc}
            colorMap={colorMap}
            onArcClick={handleClick}
            onMouseEnter={setHovered}
            onMouseLeave={() => setHovered(null)}
          />

          <SunburstLabels nodes={nodes} radius={radius} />

          <SunburstCenter
            radius={radius}
            active={active}
            root={root}
            displayName={displayName}
            centerLabel={centerLabel}
            onZoomOut={() => active.parent && handleClick(active.parent)}
          />
        </g>
      </svg>

      <SunburstBreadcrumb trail={displayChain} />
    </div>
  );
}
