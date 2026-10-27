/**
 * Hook: useForceGraph
 * Renders and manages a D3 force-directed graph: simulation, zoom/pan, drag,
 * selection/basket highlighting, and an imperative controller for the canvas
 * controls.
 *
 * This is a thin composition of the pieces in `./useGraphSimulation`,
 * `./useSelectionHighlight` and `./useGraphController` - see each for its
 * specific responsibility. This hook owns the refs those pieces share (the
 * SVG/zoom/simulation handles and the latest-callbacks ref) and wires them
 * together.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ForceLayoutConfig } from '../utils/layoutConfig';
import { GraphNodeDatum, GraphLinkDatum, GraphController, GraphPointerPosition, GraphCallbacks } from '../types';
import { useGraphSimulation } from './useGraphSimulation';
import { useSelectionHighlight } from './useSelectionHighlight';
import { useGraphController } from './useGraphController';

export type { GraphController, GraphPointerPosition };

interface UseForceGraphOptions extends GraphCallbacks {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  /** Id of the edge whose details are pinned open */
  selectedEdge?: string | null;
  /** Basket ids while in basket scope; null when every node is in scope */
  basketIds?: Set<string> | null;
  layoutConfig?: ForceLayoutConfig;
}

interface UseForceGraphResult {
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
  controller: GraphController;
}

/**
 * Build and manage a D3 force-directed graph rendered into an SVG
 */
export const useForceGraph = ({
  nodes,
  edges,
  selectedNode,
  selectedEdge,
  basketIds = null,
  layoutConfig,
  onNodeSelect,
  onNodeDeselect,
  onEdgeSelect,
  onEdgeHover,
  onNodeHover,
}: UseForceGraphOptions): UseForceGraphResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const initialFitTransformRef = useRef<d3.ZoomTransform | null>(null);

  // Keep latest callbacks available to D3 event handlers without rebuilding the graph
  const callbacksRef = useRef<GraphCallbacks>({ onNodeSelect, onNodeDeselect, onEdgeSelect, onEdgeHover, onNodeHover });
  useEffect(() => {
    callbacksRef.current = { onNodeSelect, onNodeDeselect, onEdgeSelect, onEdgeHover, onNodeHover };
  }, [onNodeSelect, onNodeDeselect, onEdgeSelect, onEdgeHover, onNodeHover]);

  const isReady = useGraphSimulation({
    containerRef,
    svgRef,
    zoomRef,
    simulationRef,
    positionsRef,
    initialFitTransformRef,
    callbacksRef,
    nodes,
    edges,
    layoutConfig,
  });

  useSelectionHighlight({ svgRef, selectedNode, selectedEdge, basketIds, isReady });

  const controller = useGraphController({
    containerRef,
    svgRef,
    zoomRef,
    simulationRef,
  });

  return { containerRef, isReady, controller };
};

export default useForceGraph;
