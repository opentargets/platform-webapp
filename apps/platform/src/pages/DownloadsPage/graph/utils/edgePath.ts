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

/**
 * Builds a cubic-bezier path between two points that leaves/enters
 * horizontally, like a flow-chart connector - unlike `curvedEdgePath`'s
 * rotational bow, this reads correctly for the ERD canvas's field-to-field
 * connectors, which always exit/enter a table card's left or right edge.
 */
export const erdEdgePath = (x1: number, y1: number, x2: number, y2: number): string => {
  const reach = Math.max(Math.abs(x2 - x1) * 0.5, 40);
  const direction = x2 >= x1 ? 1 : -1;
  const c1x = x1 + reach * direction;
  const c2x = x2 - reach * direction;
  return `M${x1},${y1} C${c1x},${y1} ${c2x},${y2} ${x2},${y2}`;
};

export default curvedEdgePath;
