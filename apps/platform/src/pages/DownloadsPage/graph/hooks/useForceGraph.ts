/**
 * Hook: useForceGraph
 * Renders and manages a D3 force-directed graph: simulation, zoom/pan, drag,
 * selection highlighting, and an imperative controller for GraphControls.
 *
 * This is a thin composition of the pieces in `./useGraphSimulation`,
 * `./useSelectionHighlight`, `./useHoverHighlight`, and `./useGraphController` -
 * see each for its specific responsibility. This hook owns the refs those
 * pieces share (the SVG/zoom/simulation handles and the latest-callbacks ref)
 * and wires them together.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ForceLayoutConfig } from '../utils/layoutConfig';
import { GraphNodeDatum, GraphLinkDatum, GraphController, GraphPointerPosition, GraphCallbacks } from '../types';
import { useGraphSimulation } from './useGraphSimulation';
import { useSelectionHighlight } from './useSelectionHighlight';
import { useHoverHighlight } from './useHoverHighlight';
import { useFilterHighlight } from './useFilterHighlight';
import { useGraphController } from './useGraphController';

export type { GraphController, GraphPointerPosition };

interface UseForceGraphOptions extends GraphCallbacks {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  /** Id of a node to highlight from outside the canvas (e.g. hovering its card) */
  externalHighlightId?: string | null;
  /** Ids of nodes matching the active filter chips/search; null means no filter active */
  filterMatchedIds?: Set<string> | null;
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
  externalHighlightId,
  filterMatchedIds,
  layoutConfig,
  onNodeSelect,
  onNodeDeselect,
  onEdgeSelect,
  onNodeHover,
}: UseForceGraphOptions): UseForceGraphResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const initialFitTransformRef = useRef<d3.ZoomTransform | null>(null);

  // Keep latest callbacks available to D3 event handlers without rebuilding the graph
  const callbacksRef = useRef<GraphCallbacks>({ onNodeSelect, onNodeDeselect, onEdgeSelect, onNodeHover });
  useEffect(() => {
    callbacksRef.current = { onNodeSelect, onNodeDeselect, onEdgeSelect, onNodeHover };
  }, [onNodeSelect, onNodeDeselect, onEdgeSelect, onNodeHover]);

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

  // Card-hover highlighting only - the canvas's own pointer hover no longer
  // raises/fades nodes, it just drives the tooltip (see useGraphSimulation).
  useHoverHighlight({
    svgRef,
    simulationRef,
    externalHighlightId,
    isReady,
  });

  useSelectionHighlight({ svgRef, selectedNode, isReady });

  useFilterHighlight({ svgRef, matchedIds: filterMatchedIds ?? null, isReady });

  const controller = useGraphController({
    containerRef,
    svgRef,
    zoomRef,
    simulationRef,
    initialFitTransformRef,
    callbacksRef,
  });

  return { containerRef, isReady, controller };
};

export default useForceGraph;
