/**
 * Shared CSS/color/id helpers used across the graph canvas's D3 rendering and
 * highlighting hooks, so node/edge styling stays consistent between them.
 */

import { GraphNodeDatum } from '../types';

export const GRAPH_STYLES = `
  .graph-node { cursor: pointer; transition: all 0.2s ease; }
  .graph-node.faded { opacity: 0.6; }
  .graph-node.hover-faded { opacity: 0.3; }
  .graph-node.selected circle {
    stroke: #FFD700 !important;
    stroke-width: 4px !important;
  }
  .graph-edge { cursor: pointer; transition: all 0.2s ease; }
  .graph-edge.faded { opacity: 0.3; }
  .graph-edge.hover-faded { opacity: 0.08 !important; }
  .graph-edge.hover-highlighted { stroke-width: 2.5px; }
  .graph-edge.highlighted {
    stroke: #2196F3 !important;
    stroke-width: 3px !important;
    opacity: 0.9 !important;
  }
`;

/** Base (unhighlighted) edge color - also used to reset a hover-highlighted edge */
export const EDGE_COLOR = '#D8DEE4';

/** A node's stroke/edge-highlight color, falling back to a neutral grey for uncategorized nodes */
export const strokeOf = (d: any): string => d.color ?? '#999';

export const getLinkEndpointId = (end: string | GraphNodeDatum): string =>
  typeof end === 'string' ? end : end.id;
