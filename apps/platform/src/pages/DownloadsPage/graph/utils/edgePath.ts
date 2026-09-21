/**
 * Builds a quadratic-bezier path between two points instead of a straight
 * line. Every edge bows the same rotational way (like a chord diagram),
 * which keeps overlapping/near-parallel edges visually separated instead of
 * stacking exactly on top of each other.
 */
export const curvedEdgePath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature = 0.15
): string => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const controlX = (x1 + x2) / 2 - dy * curvature;
  const controlY = (y1 + y2) / 2 + dx * curvature;
  return `M${x1},${y1} Q${controlX},${controlY} ${x2},${y2}`;
};

export default curvedEdgePath;
