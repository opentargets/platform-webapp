import React from "react";
import type { PartitionNode } from "./types";
import { labelVisible, getArcSpace, getContrastColor } from "./utils";

interface SunburstLabelsProps {
  nodes: PartitionNode[];
  radius: number;
  colorMap: Map<PartitionNode, string>;
}

/**
 * Computes font size that fits within the arc without overflowing.
 * Constrained by both the radial height (text length) and arc length (text height).
 */
function computeFontSize(
  name: string,
  midArcLength: number,
  radialHeight: number
): number {
  const charWidthRatio = 0.72;
  const chars = Math.max(name.length, 1);

  // Text runs radially: length along radius, width constrained by arc length
  const maxFromRadial = radialHeight / (charWidthRatio * chars);
  const maxFromArcWidth = midArcLength * 0.9;

  return Math.min(maxFromRadial, maxFromArcWidth);
}

export const SunburstLabels: React.FC<SunburstLabelsProps> = ({ nodes, radius, colorMap }) => {
  return (
    <>
      {nodes.map((d, i) => {
        const arcData = d.target ?? d.current;
        const { radialHeight, midArcLength } = getArcSpace(arcData, radius);
        const fontSize = computeFontSize(d.data.name, midArcLength, radialHeight);
        const x = (((arcData.x0 + arcData.x1) / 2) * 180) / Math.PI;
        const y = ((arcData.y0 + arcData.y1) / 2) * radius;
        const transform = `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
        const bgColor = colorMap.get(d) ?? "#fff";
        const textColor = getContrastColor(bgColor);
        return (
          <text
            key={`${d.data.name}-label-${i}`}
            className="arc-label"
            transform={transform}
            dy="0.35em"
            fillOpacity={labelVisible(arcData) ? 1 : 0}
            fill={textColor}
            pointerEvents="none"
            textAnchor="middle"
            style={{ fontSize: `${fontSize}px` }}
          >
            {d.data.name}
          </text>
        );
      })}
    </>
  );
};

