import React from "react";
import type { PartitionNode } from "./types";

interface SunburstCenterProps {
  radius: number;
  active: PartitionNode;
  root: PartitionNode;
  displayName: string;
  centerLabel: boolean;
  onZoomOut: () => void;
}

export const SunburstCenter: React.FC<SunburstCenterProps> = ({
  radius,
  active,
  root,
  displayName,
  centerLabel,
  onZoomOut,
}) => {
  const isZoomedOut = active === root;

  return (
    <>
      {/* Center circle: always opaque to mask arcs animating through the center */}
      <circle
        r={radius}
        fill="#fff"
        fillOpacity={1}
        pointerEvents={isZoomedOut ? "none" : "auto"}
        style={{ cursor: isZoomedOut ? "default" : "pointer" }}
        onClick={isZoomedOut ? undefined : onZoomOut}
      />

      {centerLabel && (
        <text
          textAnchor="middle"
          dy="0.35em"
          fontSize={14}
          fontWeight={600}
          fill="#333"
          pointerEvents="none"
        >
          {displayName}
        </text>
      )}
    </>
  );
};
