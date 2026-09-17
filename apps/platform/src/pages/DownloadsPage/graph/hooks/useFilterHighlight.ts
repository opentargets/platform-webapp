/**
 * Hook: useFilterHighlight
 * Dims nodes/edges that don't match the active filter chips + search text,
 * without touching the simulation - so toggling a filter never rebuilds the
 * graph or jumps node positions. Mirrors `useSelectionHighlight`, but keyed
 * off the filter-matched id set instead of the selected node's neighborhood.
 */

import { useEffect } from 'react';
import * as d3 from 'd3';
import { getLinkEndpointId } from '../utils/graphVisuals';

interface UseFilterHighlightOptions {
  svgRef: React.RefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  /** Ids of nodes that match the current filters; null/undefined means "no filter active" */
  matchedIds: Set<string> | null;
  isReady: boolean;
}

export const useFilterHighlight = ({ svgRef, matchedIds, isReady }: UseFilterHighlightOptions) => {
  useEffect(() => {
    const svg = svgRef.current;
    if (!isReady || !svg) return;

    const nodeSel = svg.selectAll('g.graph-node');
    const linkSel = svg.selectAll('line.graph-edge');

    if (!matchedIds) {
      nodeSel.classed('filter-faded', false);
      linkSel.classed('filter-faded', false);
      return;
    }

    nodeSel.classed('filter-faded', (d: any) => !matchedIds.has(d.id));
    linkSel.classed('filter-faded', (d: any) => {
      const sourceId = getLinkEndpointId(d.source);
      const targetId = getLinkEndpointId(d.target);
      return !matchedIds.has(sourceId) || !matchedIds.has(targetId);
    });
  }, [svgRef, matchedIds, isReady]);
};
