/**
 * Hook: useHoverHighlight
 * Raises a hovered node (and its edges) to full opacity while fading
 * everything else, so the graph stays legible with ~100 nodes/edges on
 * screen. Driven solely by `externalHighlightId` (e.g. a card hovered in the
 * list pane), handled by the effect below - the canvas's own pointer hover
 * only drives the tooltip (see `useGraphSimulation`) and does not fade/raise.
 */

import { useCallback, useEffect } from 'react';
import * as d3 from 'd3';
import { GraphNodeDatum, GraphLinkDatum } from '../types';
import { EDGE_COLOR, strokeOf, getLinkEndpointId } from '../utils/graphVisuals';

interface UseHoverHighlightOptions {
  svgRef: React.RefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  simulationRef: React.RefObject<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>;
  externalHighlightId?: string | null;
  isReady: boolean;
}

export const useHoverHighlight = ({
  svgRef,
  simulationRef,
  externalHighlightId,
  isReady,
}: UseHoverHighlightOptions) => {
  const setHoverState = useCallback(
    (hoverNode: GraphNodeDatum | null) => {
      const svg = svgRef.current;
      if (!svg) return;
      const nodeSel = svg.selectAll('g.graph-node');
      const linkSel = svg.selectAll('line.graph-edge');

      if (!hoverNode) {
        nodeSel.classed('hover-faded', false);
        linkSel
        .classed('hover-faded', false)
        .classed('hover-highlighted', false)
          .attr('stroke', EDGE_COLOR)
          .attr('stroke-opacity', 0.6);
        return;
      }

      const hoverId = hoverNode.id;
      const isTouching = (d: any) =>
        getLinkEndpointId(d.source) === hoverId || getLinkEndpointId(d.target) === hoverId;

      const neighbors = new Set<string>([hoverId]);
      linkSel.each((d: any) => {
        if (isTouching(d)) {
          neighbors.add(getLinkEndpointId(d.source));
          neighbors.add(getLinkEndpointId(d.target));
        }
      });

      nodeSel.classed('hover-faded', (d: any) => !neighbors.has(d.id));
      linkSel
        .classed('hover-highlighted', isTouching)
        .classed('hover-faded', (d: any) => !isTouching(d))
        .attr('stroke', (d: any) => (isTouching(d) ? strokeOf(hoverNode) : EDGE_COLOR))
        .attr('stroke-opacity', (d: any) => (isTouching(d) ? 0.9 : 0.08));
    },
    [svgRef]
  );

  // Mirror the same hover-raise treatment when a card in the list pane is
  // hovered, rather than the pointer moving over the canvas itself.
  useEffect(() => {
    if (!isReady) return;
    const simNodes = simulationRef.current?.nodes() ?? [];
    const datum = externalHighlightId
      ? (simNodes.find((n) => n.id === externalHighlightId) ?? null)
      : null;
    setHoverState(datum);
  }, [externalHighlightId, isReady, setHoverState, simulationRef]);

  return { setHoverState };
};
