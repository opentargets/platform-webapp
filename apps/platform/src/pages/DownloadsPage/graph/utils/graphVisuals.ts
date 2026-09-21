/**
 * Shared CSS/color/id helpers used across the graph canvas's D3 rendering and
 * highlighting hooks, so node/edge styling stays consistent between them.
 */

import { GraphNodeDatum } from '../types';

export const GRAPH_STYLES = `
  .graph-node { cursor: pointer; transition: all 0.2s ease; }
  .graph-node.faded { opacity: 0.6; }
  .graph-node.hover-faded { opacity: 0.3; }
  .graph-node.filter-faded { opacity: 0.12; }
  .graph-node.selected rect {
    stroke: #FFD700 !important;
    stroke-width: 4px !important;
  }
  .graph-edge { cursor: pointer; transition: all 0.2s ease; }
  .graph-edge.faded { opacity: 0.3; }
  .graph-edge.hover-faded { opacity: 0.08 !important; }
  .graph-edge.filter-faded { opacity: 0.06 !important; }
  .graph-edge.hover-highlighted { stroke-width: 2.5px; }
  .graph-edge.highlighted {
    stroke: #2196F3 !important;
    stroke-width: 3px !important;
    opacity: 0.9 !important;
  }
`;

/** Base (unhighlighted) edge color - also used to reset a hover-highlighted edge */
export const EDGE_COLOR = '#D8DEE4';

/**
 * Nodes render as small rounded-rectangle "cards" (like an ER-diagram table)
 * rather than circles, since each one represents a dataset - sized by degree
 * (via `size`, the 40/60/80 bucket nodeClassifier.enrichNodesWithClassification
 * already computes) rather than to their label, since the label itself
 * renders outside the box, not inside it. `getNodeHalfDiagonal` is shared
 * with radialLayout.ts so the deterministic layout's spacing calculations
 * match what's actually drawn.
 */
const NODE_WIDTH = 34;
const NODE_HEIGHT = 22;
/** `size` bucket a box at (NODE_WIDTH, NODE_HEIGHT) corresponds to - the medium-degree bucket, so low/high-degree nodes scale down/up from this baseline */
const BASE_DEGREE_SIZE = 60;

export const getNodeBoxSize = (size: number = BASE_DEGREE_SIZE): { width: number; height: number } => {
  const scale = size / BASE_DEGREE_SIZE;
  return { width: Math.round(NODE_WIDTH * scale), height: Math.round(NODE_HEIGHT * scale) };
};

/** Radius of the circle that circumscribes a node's box - used as a conservative stand-in for rectangle-rectangle collision/spacing checks. Omit `size` for the baseline (medium-degree) box. */
export const getNodeHalfDiagonal = (size: number = BASE_DEGREE_SIZE): number => {
  const { width, height } = getNodeBoxSize(size);
  return Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
};

const CHARS_PER_LABEL = 20;

export const truncateLabel = (label: string, maxChars = CHARS_PER_LABEL): string =>
  label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;

/** A node's stroke/edge-highlight color, falling back to a neutral grey for uncategorized nodes */
export const strokeOf = (d: any): string => d.color ?? '#999';

export const getLinkEndpointId = (end: string | number | GraphNodeDatum): string =>
  typeof end === 'object' ? end.id : String(end);
