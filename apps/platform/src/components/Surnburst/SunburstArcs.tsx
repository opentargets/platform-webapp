import React from "react";
import type { PartitionNode } from "./types";
import { arcVisible } from "./utils";

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
  // Render ALL nodes — D3 binds by index so we must not filter here.
  // Visibility is controlled by fillOpacity (set by D3 in useLayoutEffect).
  return (
    <>
      {nodes.map((d, i) => {
        const arcData = d.current;
        const arcPath = (arc as any)(arcData);
        const visible = arcVisible(arcData);

        return (
          <path
            key={`${d.data.name}-${i}`}
            className="arc"
            d={arcPath ?? undefined}
            fill={colorMap.get(d) ?? "#ccc"}
            fillOpacity={visible ? 1 : 0}
            stroke="#fff"
            strokeWidth={1}
            style={{ cursor: d.children ? "pointer" : "default" }}
            onClick={() => d.children && onArcClick(d)}
            onMouseEnter={() => onMouseEnter(d)}
            onMouseLeave={onMouseLeave}
            pointerEvents={visible ? "auto" : "none"}
          />
        );
      })}
    </>
  );
};
