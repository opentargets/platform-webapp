/**
 * Hook: useSelectionHighlight
 * Toggles the selected/highlighted/faded classes on nodes and edges when the
 * selected node changes, without rebuilding the simulation.
 */

import { useEffect } from 'react';
import * as d3 from 'd3';
import { getLinkEndpointId } from '../utils/graphVisuals';

interface UseSelectionHighlightOptions {
  svgRef: React.RefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  selectedNode?: string | null;
  isReady: boolean;
}

export const useSelectionHighlight = ({
  svgRef,
  selectedNode,
  isReady,
}: UseSelectionHighlightOptions) => {
  useEffect(() => {
    const svg = svgRef.current;
    if (!isReady || !svg) return;

    const nodeSel = svg.selectAll('g.graph-node');
    const linkSel = svg.selectAll('line.graph-edge');

    if (!selectedNode) {
      nodeSel.classed('selected', false).classed('faded', false);
      linkSel.classed('highlighted', false).classed('faded', false);
      return;
    }

    const connected = new Set<string>([selectedNode]);
    linkSel.each((d: any) => {
      const sourceId = getLinkEndpointId(d.source);
      const targetId = getLinkEndpointId(d.target);
      if (sourceId === selectedNode || targetId === selectedNode) {
        connected.add(sourceId);
        connected.add(targetId);
      }
    });

    nodeSel
      .classed('selected', (d: any) => d.id === selectedNode)
      .classed('faded', (d: any) => !connected.has(d.id));

    linkSel
      .classed('highlighted', (d: any) => {
        const sourceId = getLinkEndpointId(d.source);
        const targetId = getLinkEndpointId(d.target);
        return sourceId === selectedNode || targetId === selectedNode;
      })
      .classed('faded', (d: any) => {
        const sourceId = getLinkEndpointId(d.source);
        const targetId = getLinkEndpointId(d.target);
        return !(sourceId === selectedNode || targetId === selectedNode);
      });
  }, [svgRef, selectedNode, isReady]);
};
