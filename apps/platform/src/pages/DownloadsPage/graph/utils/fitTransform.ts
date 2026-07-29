/**
 * Compute the zoom transform that fits a set of node positions inside a viewport
 */
export const computeFitTransform = (
  simNodes: { x?: number; y?: number }[],
  width: number,
  height: number,
  padding = 60
) => {
  const xs = simNodes.map((n) => n.x ?? 0);
  const ys = simNodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;

  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  const scale = Math.min(3, Math.max(0.1, Math.min(width / graphWidth, height / graphHeight)));
  const translateX = width / 2 - scale * (minX + graphWidth / 2);
  const translateY = height / 2 - scale * (minY + graphHeight / 2);

  return { scale, translateX, translateY };
};
