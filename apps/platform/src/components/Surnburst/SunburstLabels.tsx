import React from "react";
import type { PartitionNode } from "./types";
import { labelVisible, labelTransform } from "./utils";

interface SunburstLabelsProps {
  nodes: PartitionNode[];
  radius: number;
}

export const SunburstLabels: React.FC<SunburstLabelsProps> = ({
  nodes,
  radius,
}) => {
  // Filter to only render visible labels for performance
  const visibleLabels = nodes.filter((d) => {
    if (!d.current) return false;
    return labelVisible(d.target ?? d.current);
  });

  return (
    <>
      {visibleLabels.map((d, i) => (
        <text
          key={`${d.data.name}-label-${i}`}
          className="arc-label"
          transform={labelTransform(d.current, radius)}
          dy="0.32em"
          fontSize={11}
          fill="#fff"
          fillOpacity={1}
          pointerEvents="none"
          style={{
            paintOrder: "stroke",
            stroke: "rgba(0,0,0,0.25)",
            strokeWidth: 2,
          }}
        >
          {d.data.name}
        </text>
      ))}
    </>
  );
};
