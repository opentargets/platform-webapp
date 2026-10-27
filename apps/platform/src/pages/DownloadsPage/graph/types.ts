/**
 * Shared types for the force-directed graph hooks (see `graph/hooks/useForceGraph.ts`).
 */

import * as d3 from 'd3';

export interface GraphNodeDatum extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  /** The dataset's category (see categoryColors.ts) */
  type: string;
  degree?: number;
  description?: string;
  [key: string]: any;
}

export interface GraphLinkDatum extends d3.SimulationLinkDatum<GraphNodeDatum> {
  id: string;
}

export interface GraphController {
  zoomIn: () => void;
  zoomOut: () => void;
  /** Fit every node in view */
  fit: () => void;
  /** Fit only the given nodes in view (falls back to `fit` when none match) */
  fitTo: (ids: Iterable<string>) => void;
}

export interface GraphPointerPosition {
  x: number;
  y: number;
}

export interface GraphCallbacks {
  onNodeSelect?: (nodeId: string, position?: GraphPointerPosition) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string, position?: GraphPointerPosition) => void;
  onEdgeHover?: (edgeId: string | null, position?: GraphPointerPosition) => void;
  onNodeHover?: (nodeId: string | null, position?: GraphPointerPosition) => void;
}
