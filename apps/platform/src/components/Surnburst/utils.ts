import type { ArcData, PartitionNode, DataNode } from "./types";

/**
 * Determines if an arc should be visible at the current zoom level
 */
export function arcVisible(d: ArcData): boolean {
  return d.y1 <= 100 && d.y0 >= 1 && d.x1 > d.x0;
}

/**
 * Determines if a label should be visible at the current zoom level
 */
export function labelVisible(d: ArcData): boolean {
  return d.y1 <= 100 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
}

/**
 * Returns "#fff" or "#000" depending on whether the background color is dark or light.
 * Uses WCAG relative luminance formula.
 */
export function getContrastColor(hexColor: string): string {
  let hex = hexColor.replace("#", "");
  // Expand 3-char shorthand (#fff → ffffff)
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  // Gamma correction
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return L > 0.179 ? "#000" : "#fff";
}

/**
 * Returns the available space for an arc and which dimension dominates.
 * - radialHeight: pixel height from inner to outer edge
 * - midArcLength: pixel arc length at the midpoint radius
 * - dominant: "tangential" if arc is wider than tall, "radial" otherwise
 */
export function getArcSpace(d: ArcData, radius: number) {
  const angularSpan = d.x1 - d.x0;
  const radialHeight = (d.y1 - d.y0) * radius;
  const midArcLength = ((d.y0 + d.y1) / 2) * radius * angularSpan;
  const dominant: "tangential" | "radial" = midArcLength >= radialHeight ? "tangential" : "radial";
  return { radialHeight, midArcLength, dominant };
}

/**
 * Calculates the SVG transform for positioning and rotating a label
 */
export function labelTransform(d: ArcData, radius: number): string {
  const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
  const y = ((d.y0 + d.y1) / 2) * radius;
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
}

/**
 * Gets the color for a node based on its top-level parent
 */
export function getColorForNode(
  node: PartitionNode,
  colorMap: Map<PartitionNode, string>,
  fallback: string = "#999"
): string {
  let current = node as any;
  while (current.depth > 1) {
    current = current.parent;
  }
  return colorMap.get(current) ?? fallback;
}

/**
 * Builds the breadcrumb trail for the current node
 */
export function getBreadcrumbTrail(node: PartitionNode): string {
  return node
    .ancestors()
    .map((d) => (d as PartitionNode).data.name)
    .reverse()
    .filter(Boolean)
    .join(" › ");
}

/**
 * Returns the breadcrumb trail as an array of nodes (for clickable breadcrumbs)
 */
export function getBreadcrumbNodes(node: PartitionNode): PartitionNode[] {
  return node
    .ancestors()
    .map((d) => d as PartitionNode)
    .reverse();
}

/**
 * PHASE 3 OPTIMIZATION: Data Simplification & Progressive Loading
 * ================================================================
 */

/**
 * Counts total nodes in hierarchy (for performance assessment)
 */
export function countNodes(data: DataNode): number {
  let count = 1;
  if (data.children) {
    count += data.children.reduce((sum, child) => sum + countNodes(child), 0);
  }
  return count;
}

/**
 * Calculates subtree size for sorting and aggregation
 */
export function getSubtreeSize(node: DataNode): number {
  return 1 + (node.children?.reduce((sum, child) => sum + getSubtreeSize(child), 0) ?? 0);
}

/**
 * Simplifies large hierarchies by aggregating children beyond threshold
 * Returns a new tree with same structure but reduced depth where needed
 *
 * @param data - Input hierarchy
 * @param maxNodeCount - If tree exceeds this, simplification is triggered
 * @param childrenThreshold - Nodes with more children than this get aggregated
 * @returns Simplified data tree
 *
 * Example: simplifyLargeDataset(data, 10000, 50)
 * - Only simplifies if dataset > 10,000 nodes
 * - Aggregates children if a node has > 50 children
 */
export function simplifyLargeDataset(
  data: DataNode,
  maxNodeCount: number = 10000,
  childrenThreshold: number = 100
): DataNode {
  const totalNodes = countNodes(data);

  // Skip if dataset is manageable
  if (totalNodes <= maxNodeCount) {
    return data;
  }

  // Recursive simplification
  const simplify = (node: DataNode): DataNode => {
    if (!node.children || node.children.length === 0) {
      return node;
    }

    let children = node.children.map(simplify);

    // Aggregate many small children into groups
    if (children.length > childrenThreshold) {
      // Keep top N by size, aggregate the rest
      const topN = Math.ceil(childrenThreshold * 0.7);
      const sorted = [...children].sort(
        (a, b) => (getSubtreeSize(b) - getSubtreeSize(a))
      );

      const top = sorted.slice(0, topN);
      const rest = sorted.slice(topN);

      if (rest.length > 0) {
        const aggregated: DataNode = {
          name: `Other (${rest.length})`,
          value: rest.reduce((sum, child) => sum + (child.value ?? 1), 0),
          children: rest,
        };
        children = [...top, aggregated];
      }
    }

    return {
      ...node,
      children,
    };
  };

  return simplify(data);
}

/**
 * Creates a lazy-loaded version of data
 * Children are loaded on-demand as user drills down
 * Useful for very large datasets (50,000+ nodes)
 *
 * @param data - Full hierarchy
 * @param maxDepthInitial - Depth to load initially (e.g., 2-3)
 * @returns Trimmed tree with lazy-loading capability
 *
 * Example: lazyLoadData(data, 2) - Load only 2 levels initially
 */
export function lazyLoadData(
  data: DataNode,
  maxDepthInitial: number = 2
): DataNode {
  const trim = (node: DataNode, depth: number): DataNode => {
    if (depth >= maxDepthInitial) {
      // Don't include children at this depth
      return {
        ...node,
        children: node.children ? [] : undefined,
      };
    }

    return {
      ...node,
      children: node.children?.map((child) => trim(child, depth + 1)),
    };
  };

  return trim(data, 0);
}

/**
 * Gets statistics about a dataset for monitoring
 * Useful for understanding performance characteristics
 */
export function getDatasetStats(data: DataNode) {
  let totalNodes = 0;
  let maxDepth = 0;
  let branchingFactor = 0;

  const traverse = (node: DataNode, depth: number = 0) => {
    totalNodes++;
    maxDepth = Math.max(maxDepth, depth);

    if (node.children) {
      branchingFactor = Math.max(branchingFactor, node.children.length);
      node.children.forEach((child) => traverse(child, depth + 1));
    }
  };

  traverse(data);

  return {
    totalNodes,
    maxDepth,
    avgBranchingFactor: branchingFactor,
    estimatedMemory: `~${Math.round(totalNodes * 200 / 1024)} KB`,
    largeDataset: totalNodes > 5000,
    veryLargeDataset: totalNodes > 20000,
  };
}
