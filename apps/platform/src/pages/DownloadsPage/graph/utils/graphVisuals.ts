/**
 * Shared CSS/color/size helpers used across the graph canvas's D3 rendering
 * and highlighting hooks, so node/edge styling stays consistent between them.
 *
 * Node visual states (see the Datasets page spec, "Network: node visual states"):
 *
 * | State      | Box    | Stroke                       | Label             | Opacity |
 * | Default    | 24×17  | 1px category                 | mono 12px grey700 | 1       |
 * | Faded      | same   | same                         | same              | .15     |
 * | In bag     | 29×21  | 1px category + check dot     | bold grey900      | 1       |
 * | Selected   | 34×24  | 2px primary.dark + outer ring| bold grey900      | 1       |
 *
 * The box is filled with the solid category colour in every state.
 *
 * The layout is computed once from fixed cell sizes (see stackedLayout.ts) and
 * never changes with state, so toggling basket mode or a selection only
 * restyles nodes in place.
 */

import { GraphNodeDatum } from '../types';
import { MONO_FONT } from '../../components/tokens';

/** palette.primary.dark of the platform theme (darken(0.2, #3489ca)) */
export const PRIMARY_DARK = '#1f5279';
/** Base (unhighlighted) edge color on the network canvas */
export const EDGE_COLOR = '#b0bec5';
export const EDGE_HIGHLIGHT_COLOR = PRIMARY_DARK;

const GREY_700 = '#616161';
const GREY_900 = '#212121';

export const GRAPH_STYLES = `
  .graph-node { cursor: pointer; transition: opacity 0.2s ease; }
  .graph-node .node-box { stroke-width: 1px; }
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
  .graph-node.faded { opacity: 0.15; }
  .graph-node.in-basket .node-check { display: inline; }
  .graph-node.in-basket text, .graph-node.selected text { font-weight: 700; fill: ${GREY_900}; }
  .graph-node.selected .node-box { stroke: ${PRIMARY_DARK} !important; stroke-width: 2px; }
  .graph-node.selected .node-ring { display: inline; }

  .graph-lane rect { fill-opacity: 0.07; }
  .graph-lane text {
    font-family: ${MONO_FONT};
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

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

/** Box size in each state. Every node is the same size: degree is shown by lane order (see stackedLayout.ts) */
export const NODE_BOX: Record<NodeVisualState, { width: number; height: number }> = {
  default: { width: 24, height: 17 },
  basket: { width: 29, height: 21 },
  selected: { width: 34, height: 24 },
};
export const NODE_RADIUS = 3;
/** Gap between the selected box and its outer ring */
export const SELECT_RING_OFFSET = 4;
export const CHECK_DOT_RADIUS = 6;
/** Space between the right edge of the box and the label beside it */
const LABEL_SIDE_GAP = 8;

/**
 * Size a node group's box, ring, check dot and label for its visual state.
 * Called at build time (all default) and again by useSelectionHighlight
 * whenever the mode or selection changes.
 */
export const applyNodeGeometry = (
  nodeSel: any,
  stateOf: (d: GraphNodeDatum) => NodeVisualState
) => {
  const box = (d: GraphNodeDatum) => NODE_BOX[stateOf(d)];
  nodeSel
    .select('rect.node-box')
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
  // The label runs to the right of the box, like a list row
  nodeSel
    .select('text')
    .attr('text-anchor', 'start')
    .attr('x', (d: GraphNodeDatum) => box(d).width / 2 + LABEL_SIDE_GAP)
    .attr('dy', 4);
};

const CHARS_PER_LABEL = 20;

export const truncateLabel = (label: string, maxChars = CHARS_PER_LABEL): string =>
  label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;

/** A node's stroke/edge-highlight color, falling back to a neutral grey for uncategorized nodes */
export const strokeOf = (d: any): string => d.color ?? '#999';

export const getLinkEndpointId = (end: string | number | GraphNodeDatum): string =>
  typeof end === 'object' ? end.id : String(end);
