import React from "react";
import type { ArcData, PartitionNode } from "./types";
import { labelVisible, labelTransform } from "./utils";

interface SunburstLabelsProps {
  nodes: PartitionNode[];
  radius: number;
}

/**
 * Computes a font size that fills the arc without overflowing it.
 * Constrained by both the arc length (angular span at midpoint) and radial thickness.
 */
function computeFontSize(d: ArcData, radius: number, name: string): number {
  const midRadius = ((d.y0 + d.y1) / 2) * radius;
  const arcLength = midRadius * (d.x1 - d.x0);
  const radialHeight = (d.y1 - d.y0) * radius;

  // Use 0.65 ratio — conservative estimate of character width relative to font size.
  // This ensures even wide characters (m, w, M) don't overflow.
  const charWidthRatio = 0.65;
  const maxFromArcLength = arcLength / (charWidthRatio * Math.max(name.length, 1));
  // Leave 25% padding inside radial thickness
  const maxFromRadialHeight = radialHeight * 0.75;

  return Math.min(maxFromArcLength, maxFromRadialHeight);
}

export const SunburstLabels: React.FC<SunburstLabelsProps> = ({
  nodes,
  radius,
}) => {
  return (
    <>
      {nodes.map((d, i) => {
        const arcData = d.target ?? d.current;
        const fontSize = computeFontSize(arcData, radius, d.data.name);
        return (
          <text
            key={`${d.data.name}-label-${i}`}
            className="arc-label"
            transform={labelTransform(arcData, radius)}
            dy="0.35em"
            fillOpacity={labelVisible(arcData) ? 1 : 0}
            fill="#000"
            pointerEvents="none"
            textAnchor="middle"
            style={{
              fontSize: `${fontSize}px`,
            }}
          >
            {d.data.name}
          </text>
        );
      })}
    </>
  );
};
