import React from "react";
import type { PartitionNode } from "./types";
import { arcVisible, getColorForNode } from "./utils";

interface SunburstArcsProps {
  nodes: PartitionNode[];
  arc: any;
  colorMap: Map<PartitionNode, string>;
  onArcClick: (node: PartitionNode) => void;
  onMouseEnter: (node: PartitionNode) => void;
  onMouseLeave: () => void;
}

export const SunburstArcs: React.FC<SunburstArcsProps> = ({
  nodes,
  arc,
  colorMap,
  onArcClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  // Memoize visible nodes for performance with large datasets
  const visibleNodes = nodes.filter((d) => {
    if (!d.current) return false;
    const arcData = d.target ?? d.current;
    return arcVisible(arcData);
  });

  return (
    <>
      {visibleNodes.map((d, i) => {
        const arcPath = (arc as any)(d.current);

        return (
          <path
            key={`${d.data.name}-${i}`}
            className="arc"
            d={arcPath ?? undefined}
            fill={getColorForNode(d, colorMap)}
            fillOpacity={d.children ? 0.9 : 0.75}
            stroke="#fff"
            strokeWidth={1}
            style={{ cursor: d.children ? "pointer" : "default" }}
            onClick={() => d.children && onArcClick(d)}
            onMouseEnter={() => onMouseEnter(d)}
            onMouseLeave={onMouseLeave}
            pointerEvents="auto"
          />
        );
      })}
    </>
  );
};
