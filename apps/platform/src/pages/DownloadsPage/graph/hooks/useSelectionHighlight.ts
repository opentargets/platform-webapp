/**
 * Hook: useSelectionHighlight
 * Applies the network's focus modes to the already-rendered nodes and edges
 * (classes + per-state geometry), without rebuilding the simulation or
 * moving a single node:
 *
 * - `none`:   everything at default.
 * - `basket`: basket nodes are "In basket", every other node is Faded (still
 *             clickable); edges between basket items are highlighted.
 * - `select`: the selected node and its neighbours are strong, the rest
 *             Faded; edges touching the selection are highlighted.
 *
 * Basket mode and a selection can be combined.
 */

import { useEffect } from 'react';
import * as d3 from 'd3';
import { getLinkEndpointId, applyNodeGeometry, NodeVisualState } from '../utils/graphVisuals';

interface UseSelectionHighlightOptions {
  svgRef: React.RefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  selectedNode?: string | null;
  /** Edge whose details are pinned open (clicked), kept visibly highlighted */
  selectedEdge?: string | null;
  /** Ids in the basket while the network scope is "basket"; null when the scope is "all" */
  basketIds?: Set<string> | null;
  isReady: boolean;
}

export const useSelectionHighlight = ({
  svgRef,
  selectedNode,
  selectedEdge,
  basketIds = null,
  isReady,
}: UseSelectionHighlightOptions) => {
  useEffect(() => {
    const svg = svgRef.current;
    if (!isReady || !svg) return;
    svg.selectAll('path.graph-edge').classed('edge-pinned', (d: any) => d.id === selectedEdge);
  }, [svgRef, selectedEdge, isReady]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!isReady || !svg) return;

    const nodeSel = svg.selectAll('g.graph-node');
    const linkSel = svg.selectAll('path.graph-edge');

    const basketMode = basketIds !== null;
    const selectMode = Boolean(selectedNode);

    if (!basketMode && !selectMode) {
      nodeSel.classed('selected', false).classed('in-basket', false).classed('neighbour', false).classed('faded', false);
      linkSel.classed('highlighted', false).classed('faded', false);
      applyNodeGeometry(nodeSel, () => 'default');
      return;
    }

    const inBasket = (id: string) => Boolean(basketIds?.has(id));

    const neighbourhood = new Set<string>();
    if (selectedNode) {
      neighbourhood.add(selectedNode);
      linkSel.each((d: any) => {
        const sourceId = getLinkEndpointId(d.source);
        const targetId = getLinkEndpointId(d.target);
        if (sourceId === selectedNode || targetId === selectedNode) {
          neighbourhood.add(sourceId);
          neighbourhood.add(targetId);
        }
      });
    }

    const isStrong = (id: string) => (basketMode && inBasket(id)) || neighbourhood.has(id);

    const isHighlightedEdge = (d: any) => {
      const sourceId = getLinkEndpointId(d.source);
      const targetId = getLinkEndpointId(d.target);
      if (selectedNode && (sourceId === selectedNode || targetId === selectedNode)) return true;
      return basketMode && inBasket(sourceId) && inBasket(targetId);
    };

    const stateOf = (d: any): NodeVisualState => {
      if (d.id === selectedNode) return 'selected';
      if (basketMode && inBasket(d.id)) return 'basket';
      return 'default';
    };

    nodeSel
      .classed('selected', (d: any) => d.id === selectedNode)
      .classed('neighbour', (d: any) => d.id !== selectedNode && neighbourhood.has(d.id))
      .classed('in-basket', (d: any) => basketMode && inBasket(d.id))
      .classed('faded', (d: any) => !isStrong(d.id));
    applyNodeGeometry(nodeSel, stateOf);

    linkSel.classed('highlighted', isHighlightedEdge).classed('faded', (d: any) => !isHighlightedEdge(d));
  }, [svgRef, selectedNode, basketIds, isReady]);
};
