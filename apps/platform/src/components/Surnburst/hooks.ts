import { useMemo, useState } from "react";
import * as d3 from "d3";
import type { DataNode, ArcData, PartitionNode } from "./types";

/**
 * Determines if an arc should be visible at the current zoom level
 */
function isArcVisible(arcData: ArcData): boolean {
  return arcData.y1 <= 3 && arcData.y0 >= 1 && arcData.x1 > arcData.x0;
}

/**
 * Builds and initializes the partition hierarchy
 * Optionally limits depth for performance with large datasets
 */
function buildPartition(data: DataNode, maxDepth: number = Infinity): PartitionNode {
  const root = d3
    .hierarchy(data)
    .sum((d) => (d.children ? 0 : d.value ?? 1))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  (d3.partition() as any).size([2 * Math.PI, root.height + 1])(root);

  root.each((d) => {
    const node = d as unknown as PartitionNode;
    node.current = { x0: node.x0, x1: node.x1, y0: node.y0, y1: node.y1 };
    // Prune children if depth limit reached
    if (node.depth >= maxDepth && node.children) {
      node.children = [];
    }
  });

  return root as PartitionNode;
}

/**
 * Hook to manage the sunburst partition hierarchy
 * Filters nodes based on visibility at current zoom level for performance
 */
export function useSunburstPartition(data: DataNode, maxDepth: number = 10) {
  const root = useMemo(() => buildPartition(data, maxDepth), [data, maxDepth]);

  const nodes = useMemo(() => {
    // Filter to only include nodes that are potentially visible
    const descendants = root
      .descendants()
      .filter((d) => {
        if (d.depth === 0) return false; // Skip root
        // Keep node if it passes visibility check or has visible children
        const arcData = (d as PartitionNode).current;
        return isArcVisible(arcData) || d.children?.length > 0;
      });
    return descendants;
  }, [root]);

  return { root, nodes };
}

/**
 * Hook to create the D3 arc generator
 * Optimized with safe undefined checks
 */
export function useSunburstArc(radius: number) {
  const arc = useMemo(
    () => {
      return (d3.arc() as any)
        .startAngle((d: ArcData) => d?.x0 ?? 0)
        .endAngle((d: ArcData) => d?.x1 ?? 0)
        .padAngle((d: ArcData) => Math.min((d?.x1 - d?.x0) / 2 || 0, 0.002))
        .padRadius(radius * 1.5)
        .innerRadius((d: ArcData) => Math.sqrt(d?.y0 ?? 0) * radius)
        .outerRadius((d: ArcData) =>
          Math.max(
            Math.sqrt(d?.y0 ?? 0) * radius,
            Math.sqrt(d?.y1 ?? 0) * radius - 1
          )
        );
    },
    [radius]
  );

  return arc;
}

/**
 * Hook to manage zoom focus state
 */
export function useSunburstFocus(root: PartitionNode) {
  const [focus, setFocus] = useState<PartitionNode | null>(null);

  const handleClick = (p: PartitionNode): void => {
    root.each((d: any) => {
      const node = d as PartitionNode;
      node.target = {
        x0:
          Math.max(0, Math.min(1, (node.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1:
          Math.max(0, Math.min(1, (node.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, node.y0 - p.depth),
        y1: Math.max(0, node.y1 - p.depth),
      };
    });
    setFocus(p.depth === 0 ? null : p);
  };

  return { focus, setFocus, handleClick };
}

/**
 * Hook to create color mapping for nodes
 */
export function useSunburstColorMap(
  root: PartitionNode,
  colors: string[]
) {
  const colorMap = useMemo(() => {
    const map = new Map();
    const topLevel = (root.children as PartitionNode[]) ?? [];
    topLevel.forEach((c, i) => map.set(c, colors[i % colors.length]));
    return map;
  }, [root, colors]);

  return colorMap;
}
