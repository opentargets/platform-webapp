/**
 * Shared CSS/color/size helpers used across the graph canvas's D3 rendering
 * and highlighting hooks, so node/edge styling stays consistent between them.
 *
 * Node visual states (see the Datasets page spec, "Network: node visual states"):
 *
 * | State      | Box    | Fill | Stroke                       | Label             | Opacity |
 * | Default    | 14×10  | .35  | 1px category                 | mono 9px grey700  | 1       |
 * | Faded      | same   | same | same                         | same              | .15     |
 * | In basket  | 18×13  | .6   | 1px category + check dot     | bold grey900      | 1       |
 * | Selected   | 22×16  | .6   | 2px primary.dark + outer ring| bold grey900      | 1       |
 *
 * The layout is computed once from a fixed footprint (`LAYOUT_FOOTPRINT`) and
 * never changes with state, so toggling basket mode or a selection only
 * restyles nodes in place.
 */

import { GraphNodeDatum } from '../types';

/** palette.primary.dark of the platform theme (darken(0.2, #3489ca)) */
export const PRIMARY_DARK = '#1f5279';
/** Base (unhighlighted) edge color on the network canvas */
export const EDGE_COLOR = '#b0bec5';
export const EDGE_HIGHLIGHT_COLOR = PRIMARY_DARK;

export const MONO_FONT = "'Roboto Mono', monospace";
const GREY_700 = '#616161';
const GREY_900 = '#212121';

export const GRAPH_STYLES = `
  .graph-node { cursor: pointer; transition: opacity 0.2s ease; }
  .graph-node .node-box { fill-opacity: 0.35; stroke-width: 1px; transition: fill-opacity 0.2s ease; }
  .graph-node .node-ring, .graph-node .node-check { display: none; }
  .graph-node text {
    font-family: ${MONO_FONT};
    font-size: 12px;
    fill: ${GREY_700};
    paint-order: stroke;
    stroke: #fff;
    stroke-width: 3px;
    stroke-linejoin: round;
  }
  /* Labels hidden by the progressive reveal come back for anything in focus */
  .graph-node:hover text,
  .graph-node.selected text,
  .graph-node.neighbour text,
  .graph-node.in-basket text { display: inline !important; }
  .graph-node.faded { opacity: 0.15; }
  .graph-node.in-basket .node-box { fill-opacity: 0.6; }
  .graph-node.in-basket .node-check { display: inline; }
  .graph-node.in-basket text, .graph-node.selected text { font-weight: 700; fill: ${GREY_900}; }
  .graph-node.selected .node-box { fill-opacity: 0.6; stroke: ${PRIMARY_DARK} !important; stroke-width: 2px; }
  .graph-node.selected .node-ring { display: inline; }

  .graph-edge { cursor: pointer; transition: stroke-opacity 0.2s ease, opacity 0.2s ease; }
  .graph-edge.faded { stroke-opacity: 0.08 !important; }
  .graph-edge.highlighted,
  .graph-edge.edge-active,
  .graph-edge.edge-pinned {
    stroke: ${EDGE_HIGHLIGHT_COLOR} !important;
    stroke-width: 1.6px !important;
    stroke-opacity: 0.85 !important;
    opacity: 1 !important;
  }
`;

export type NodeVisualState = 'default' | 'basket' | 'selected';

/** Box size for a degree-1 node in each state; `getDegreeScale` grows it with connectivity */
export const NODE_BOX: Record<NodeVisualState, { width: number; height: number }> = {
  default: { width: 24, height: 17 },
  basket: { width: 29, height: 21 },
  selected: { width: 34, height: 24 },
};

/** Degree at which the size scale stops growing */
const DEGREE_CAP = 40;
/** Size multiplier of the most connected nodes relative to a degree-1 node */
const MAX_DEGREE_SCALE = 2.8;

/**
 * Degree-driven size multiplier: 1 for a leaf, rising with the square root
 * of degree (so area tracks connectivity) to MAX_DEGREE_SCALE at DEGREE_CAP.
 * Hubs like target/disease read as much bigger than evidence leaves.
 */
export const getDegreeScale = (degree: number | undefined): number => {
  const d = Math.min(Math.max((degree ?? 1) - 1, 0), DEGREE_CAP);
  return 1 + (MAX_DEGREE_SCALE - 1) * Math.sqrt(d / DEGREE_CAP);
};

/** Drawn box size for a node in a given state, scaled by its degree */
export const getNodeBox = (
  state: NodeVisualState,
  degree: number | undefined
): { width: number; height: number } => {
  const scale = getDegreeScale(degree);
  return { width: Math.round(NODE_BOX[state].width * scale), height: Math.round(NODE_BOX[state].height * scale) };
};
export const NODE_RADIUS = 3;
/** Gap between the selected box and its outer ring */
export const SELECT_RING_OFFSET = 4;
export const CHECK_DOT_RADIUS = 6;
/** Space between the bottom of the box and the label baseline */
const LABEL_GAP = 13;

/**
 * Footprint reserved per degree-1 node by the radial layout and the
 * collision force, scaled by degree like the box. Sized to the box plus
 * breathing room rather than to the label (labels are revealed
 * progressively, see `isLabelVisible`), so the boxes themselves fill the
 * canvas once the view is fitted. Independent of the node's visual state so
 * selecting or basketing a node never moves anything.
 */
const LAYOUT_FOOTPRINT = { width: 36, height: 28 };

/** Radius of the circle around a node's layout footprint - what spacing/collision checks use. */
export const getNodeHalfDiagonal = (degree?: number): number => {
  const scale = getDegreeScale(degree);
  return Math.sqrt(((LAYOUT_FOOTPRINT.width * scale) / 2) ** 2 + ((LAYOUT_FOOTPRINT.height * scale) / 2) ** 2);
};

export const getLabelOffset = (state: NodeVisualState, degree: number | undefined): number =>
  getNodeBox(state, degree).height / 2 + LABEL_GAP;

/**
 * Size a node group's box, ring, check dot and label for its visual state.
 * Called at build time (all default) and again by useSelectionHighlight
 * whenever the mode or selection changes.
 */
export const applyNodeGeometry = (nodeSel: any, stateOf: (d: GraphNodeDatum) => NodeVisualState) => {
  const box = (d: GraphNodeDatum) => getNodeBox(stateOf(d), d.degree);
  nodeSel
    .selectAll('rect.node-box, rect.node-base')
    .attr('width', (d: GraphNodeDatum) => box(d).width)
    .attr('height', (d: GraphNodeDatum) => box(d).height)
    .attr('x', (d: GraphNodeDatum) => -box(d).width / 2)
    .attr('y', (d: GraphNodeDatum) => -box(d).height / 2);
  nodeSel
    .select('rect.node-ring')
    .attr('width', (d: GraphNodeDatum) => box(d).width + SELECT_RING_OFFSET * 2)
    .attr('height', (d: GraphNodeDatum) => box(d).height + SELECT_RING_OFFSET * 2)
    .attr('x', (d: GraphNodeDatum) => -box(d).width / 2 - SELECT_RING_OFFSET)
    .attr('y', (d: GraphNodeDatum) => -box(d).height / 2 - SELECT_RING_OFFSET);
  nodeSel
    .select('g.node-check')
    .attr('transform', (d: GraphNodeDatum) => `translate(${box(d).width / 2}, ${-box(d).height / 2})`);
  nodeSel.select('text').attr('dy', (d: GraphNodeDatum) => getLabelOffset(stateOf(d), d.degree));
};

/**
 * Progressive label reveal: at the fitted view only well-connected nodes are
 * labelled; the rest appear once the user zooms in past LABEL_REVEAL_ZOOM
 * times the fit scale. Hovered, selected, neighbour and in-basket nodes are
 * always labelled through GRAPH_STYLES, whatever the zoom.
 */
export const LABEL_REVEAL_ZOOM = 1.5;
export const LABEL_REVEAL_DEGREE = 6;

/** Whether a node's label is visible at the given zoom, expressed as a multiple of the fit scale */
export const isLabelVisible = (degree: number | undefined, zoomMultiple: number): boolean =>
  (degree ?? 0) >= LABEL_REVEAL_DEGREE || zoomMultiple >= LABEL_REVEAL_ZOOM;

const CHARS_PER_LABEL = 20;

export const truncateLabel = (label: string, maxChars = CHARS_PER_LABEL): string =>
  label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;

/** A node's stroke/edge-highlight color, falling back to a neutral grey for uncategorized nodes */
export const strokeOf = (d: any): string => d.color ?? '#999';

export const getLinkEndpointId = (end: string | number | GraphNodeDatum): string =>
  typeof end === 'object' ? end.id : String(end);
