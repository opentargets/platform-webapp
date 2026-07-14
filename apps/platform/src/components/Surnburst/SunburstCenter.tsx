import React from "react";
import type { PartitionNode } from "./types";
import { getContrastColor } from "./utils";

interface SunburstCenterProps {
  radius: number;
  active: PartitionNode;
  root: PartitionNode;
  displayName: string;
  centerLabel: boolean;
  colorMap: Map<PartitionNode, string>;
  onZoomOut: () => void;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
}

export const SunburstCenter: React.FC<SunburstCenterProps> = ({
  radius,
  active,
  root,
  displayName,
  centerLabel,
  colorMap,
  onZoomOut,
  onMouseEnter,
  onMouseLeave,
}) => {
  const isZoomedOut = active === root;
  const fillColor = isZoomedOut ? "#fff" : (colorMap.get(active as PartitionNode) ?? "#fff");
  const textColor = getContrastColor(fillColor);

  // Font size fits within the center circle diameter (10% padding)
  const diameter = radius * 2;
  const fontSize = Math.min(
    diameter / (0.72 * Math.max(displayName.length, 1)), // constrained by text width
    radius * 0.3                                          // constrained by circle height
  );

  return (
    <>
      {/* Center circle: colored by NES when drilled in, white at root */}
      <circle
        r={radius}
        fill={fillColor}
        fillOpacity={1}
        pointerEvents={isZoomedOut ? "none" : "auto"}
        style={{ cursor: isZoomedOut ? "default" : "pointer" }}
        onClick={isZoomedOut ? undefined : onZoomOut}
        onMouseEnter={isZoomedOut ? undefined : onMouseEnter}
        onMouseLeave={isZoomedOut ? undefined : onMouseLeave}
      />

      {centerLabel && (
        <text
          textAnchor="middle"
          dy="0.35em"
          fontSize={fontSize}
          fill={textColor}
          pointerEvents="none"
        >
          {displayName}
        </text>
      )}
    </>
  );
};
