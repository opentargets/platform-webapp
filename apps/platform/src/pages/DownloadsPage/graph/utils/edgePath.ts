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

/** Largest bow (minor semi-axis) an elliptical edge may have, so long arcs stay inside the stack */
const MAX_EDGE_BOW = 70;

/**
 * Half-ellipse arc between two points, for the stacked-lanes layout: the
 * chord is the ellipse's major axis and `flatness` the minor:major ratio,
 * with the bow capped at MAX_EDGE_BOW so a lane-spanning edge flattens out
 * instead of looping far above the stack. Endpoints are ordered
 * left-to-right (then top-to-bottom) before drawing so every arc bows to the
 * same side, whichever way the edge was stored.
 */
export const ellipticalEdgePath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  flatness = 0.45
): string => {
  const swap = x1 > x2 || (x1 === x2 && y1 > y2);
  const [ax, ay, bx, by] = swap ? [x2, y2, x1, y1] : [x1, y1, x2, y2];
  const dx = bx - ax;
  const dy = by - ay;
  const chord = Math.sqrt(dx * dx + dy * dy);
  if (chord < 1) return `M${ax},${ay} L${bx},${by}`;
  const rx = chord / 2;
  const ry = Math.min(rx * flatness, MAX_EDGE_BOW);
  const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
  return `M${ax},${ay} A${rx},${ry} ${rotation} 0 1 ${bx},${by}`;
};
