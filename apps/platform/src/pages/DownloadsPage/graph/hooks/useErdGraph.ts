/**
 * Hook: useErdGraph
 * Thin composition of `useErdSimulation` (rendering), `useFilterHighlight`
 * (search-match dimming, reused unchanged from the main graph since the ERD
 * canvas shares its `.graph-node`/`.graph-edge` class names) and the shared
 * `useGraphController` (zoom/fit/reset/export) - mirrors `useForceGraph`.
 */

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { ForceLayoutConfig } from '../utils/layoutConfig';
import { GraphController, GraphPointerPosition } from '../types';
import { useErdSimulation } from './useErdSimulation';
import { useFilterHighlight } from './useFilterHighlight';
import { useGraphController } from './useGraphController';

export type { GraphController, GraphPointerPosition };

interface UseErdGraphOptions {
  nodes: any[];
  edges: any[];
  /** Ids of nodes matching the active search text; null means no filter active */
  matchedIds?: Set<string> | null;
  layoutConfig?: ForceLayoutConfig;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string, position?: GraphPointerPosition) => void;
  onEdgeHover?: (edgeId: string | null, position?: GraphPointerPosition) => void;
}

interface UseErdGraphResult {
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
  controller: GraphController;
}

export const useErdGraph = ({
  nodes,
  edges,
  matchedIds,
  layoutConfig,
  onNodeDeselect,
  onEdgeSelect,
  onEdgeHover,
}: UseErdGraphOptions): UseErdGraphResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const initialFitTransformRef = useRef<d3.ZoomTransform | null>(null);

  const callbacksRef = useRef({ onNodeDeselect, onEdgeSelect, onEdgeHover });
  useEffect(() => {
    callbacksRef.current = { onNodeDeselect, onEdgeSelect, onEdgeHover };
  }, [onNodeDeselect, onEdgeSelect, onEdgeHover]);

  const isReady = useErdSimulation({
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

  useFilterHighlight({ svgRef, matchedIds: matchedIds ?? null, isReady });

  const controller = useGraphController({
    containerRef,
    svgRef,
    zoomRef,
    simulationRef,
    initialFitTransformRef,
    callbacksRef: callbacksRef as any,
  });

  return { containerRef, isReady, controller };
};

export default useErdGraph;
