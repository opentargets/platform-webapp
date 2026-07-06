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
      {/* Center circle: click to zoom out */}
      <circle
        r={radius * 0.55}
        fill="#fff"
        fillOpacity={isZoomedOut ? 0 : 0.7}
        pointerEvents={isZoomedOut ? "none" : "auto"}
        style={{ cursor: "pointer" }}
        onClick={onZoomOut}
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
