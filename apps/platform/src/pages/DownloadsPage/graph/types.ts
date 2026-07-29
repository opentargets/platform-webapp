/**
 * Shared types for the force-directed graph hooks (see `graph/hooks/useForceGraph.ts`).
 */

import * as d3 from 'd3';

export interface GraphNodeDatum extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'core' | 'evidence' | 'attribute';
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
  fit: () => void;
  center: () => void;
  reset: () => void;
  exportPNG: () => void;
  exportSVG: () => void;
}

export interface GraphPointerPosition {
  x: number;
  y: number;
}

export interface GraphCallbacks {
  onNodeSelect?: (nodeId: string, position?: GraphPointerPosition) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
  onNodeHover?: (nodeId: string | null, position?: GraphPointerPosition) => void;
}
