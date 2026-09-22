/**
 * Sizing/geometry helpers for the ERD (schema-diagram) canvas. Each node
 * there renders as a database-table card - a header plus one row per field -
 * whose height comes from its field count, unlike the main force graph's
 * nodes, which are small boxes sized by a degree bucket (see graphVisuals.ts).
 */

import { getNodeHalfDiagonal } from './graphVisuals';

export const ERD_NODE_WIDTH = 260;
export const ERD_HEADER_HEIGHT = 34;
export const ERD_ROW_HEIGHT = 22;
const BODY_PADDING = 8;

export interface ErdBoxSize {
  width: number;
  height: number;
}

export const getErdNodeBoxSize = (fieldCount: number): ErdBoxSize => ({
  width: ERD_NODE_WIDTH,
  height: ERD_HEADER_HEIGHT + Math.max(fieldCount, 1) * ERD_ROW_HEIGHT + BODY_PADDING,
});

/** Radius of the circle that circumscribes a table card - used as a conservative stand-in for rectangle-rectangle collision/spacing checks, same approach as the main graph's `getNodeHalfDiagonal`. */
export const getErdHalfDiagonal = (fieldCount: number): number => {
  const { width, height } = getErdNodeBoxSize(fieldCount);
  return Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
};

// radialLayout.ts (reused as-is for the ERD's deterministic hub-and-spoke
// placement) sizes its spacing off a node's `size` property, on the main
// graph's degree-bucket scale (see graphVisuals.ts). Converting each table
// card's real half-diagonal onto that same scale lets the layout space out
// wildly different card heights correctly without needing its own copy of
// radialLayout's spacing math.
const BASELINE_HALF_DIAGONAL = getNodeHalfDiagonal();
export const syntheticSizeFor = (fieldCount: number): number =>
  (getErdHalfDiagonal(fieldCount) / BASELINE_HALF_DIAGONAL) * 60;

/** An SVG path for a rectangle with only its top two corners rounded, for a table card's header (sitting on a fully-rounded body card underneath) */
export const roundedTopRectPath = (x: number, y: number, width: number, height: number, r: number): string =>
  `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
  `L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} Z`;
