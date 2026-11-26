/**
 * Compute the zoom transform that fits a set of node positions inside a viewport
 */
export interface GraphBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const computeFitTransform = (
  simNodes: { x?: number; y?: number }[],
  width: number,
  height: number,
  // Clears a node's box, not just its center point
  padding = 64,
  // Anything drawn beyond the nodes that must stay in view (the stacked
  // layout's lane bands)
  extra: GraphBounds | null = null
) => {
  const xs = simNodes.map((n) => n.x ?? 0);
  const ys = simNodes.map((n) => n.y ?? 0);
  const minX = Math.min(Math.min(...xs) - padding, extra?.minX ?? Infinity);
  const maxX = Math.max(Math.max(...xs) + padding, extra?.maxX ?? -Infinity);
  const minY = Math.min(Math.min(...ys) - padding, extra?.minY ?? Infinity);
  const maxY = Math.max(Math.max(...ys) + padding, extra?.maxY ?? -Infinity);

  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  // Always fits every node in view
  const scale = Math.min(3, Math.max(0.1, Math.min(width / graphWidth, height / graphHeight)));
  const translateX = width / 2 - scale * (minX + graphWidth / 2);
  const translateY = height / 2 - scale * (minY + graphHeight / 2);

  return { scale, translateX, translateY };
};
