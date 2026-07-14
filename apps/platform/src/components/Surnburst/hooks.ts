import { useMemo, useState } from "react";
import * as d3 from "d3";
import type { DataNode, ArcData, PartitionNode } from "./types";
import { mapToPrioritizationColor } from "../GeneEnrichmentAnalysis/utils/colorPalettes";

/**
 * Determines if an arc should be visible at the current zoom level
 */
function isArcVisible(arcData: ArcData): boolean {
  return arcData.y1 <= 100 && arcData.y0 >= 1 && arcData.x1 > arcData.x0;
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
        return isArcVisible(arcData) || (d.children?.length ?? 0) > 0;
      });
    return descendants;
  }, [root]);

  return { root, nodes };
}

/**
 * Hook to create the D3 arc generator
 * Optimized with proper padding and radius scaling like the reference implementation
 */
export function useSunburstArc(radius: number) {
  return useMemo(() => {
    return (d3.arc() as any)
      .startAngle((d: ArcData) => d.x0)
      .endAngle((d: ArcData) => d.x1)
      .padAngle((d: ArcData) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius * 1.5)
      .innerRadius((d: ArcData) => d.y0 * radius)
      .outerRadius((d: ArcData) => Math.max(d.y0 * radius, d.y1 * radius - 1));
  }, [radius]);
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
 * Hook to create color mapping for nodes based on NES values.
 * Matches the old ResultsSunburst implementation exactly:
 * each node uses its own NES (or 0 if absent), colored against the global NES range.
 */
export function useSunburstColorMap(
  root: PartitionNode,
  _colors: string[]
) {
  const colorMap = useMemo(() => {
    const map = new Map<PartitionNode, string>();

    const allNodes = root.descendants() as PartitionNode[];
    const nesValues = allNodes
      .map((n) => n.data.NES)
      .filter((v): v is number => v !== undefined && v !== null);

    const minNES = nesValues.length ? Math.min(...nesValues) : -1;
    const maxNES = nesValues.length ? Math.max(...nesValues) : 1;

    allNodes.forEach((node) => {
      if (node.depth === 0) return;
      const nes = node.data.NES ?? 0;
      map.set(node, mapToPrioritizationColor(nes, minNES, maxNES));
    });

    return map;
  }, [root]);

  return colorMap;
}
