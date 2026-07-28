/**
 * Hook: useForceGraph
 * Renders and manages a D3 force-directed graph: simulation, zoom/pan, drag,
 * selection highlighting, and an imperative controller for GraphControls.
 *
 * Note: the workspace resolves the `d3` package to v5 at runtime (even though
 * `@types/d3` ships v7 typings), so event listeners here use the d3 v5
 * calling convention - `(d, i)` with the native event read from `d3.event` -
 * rather than the newer v6+ `(event, d)` convention. `d3 as any` casts are
 * used where the v7 typings disagree with the actual v5 runtime API.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getNodeTypes } from '../utils/nodeClassifier';
import { getDefaultLayoutConfig, ForceLayoutConfig } from '../utils/layoutConfig';

interface GraphNodeDatum extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'core' | 'evidence' | 'attribute';
  degree?: number;
  description?: string;
  [key: string]: any;
}

interface GraphLinkDatum extends d3.SimulationLinkDatum<GraphNodeDatum> {
  id: string;
}

export interface GraphController {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  center: () => void;
  reset: () => void;
  exportPNG: () => void;
  exportJSON: () => void;
}

interface UseForceGraphOptions {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  layoutConfig?: ForceLayoutConfig;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
}

interface UseForceGraphResult {
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
  controller: GraphController;
}

const GRAPH_STYLES = `
  .graph-node { cursor: pointer; }
  .graph-node.faded { opacity: 0.2; }
  .graph-node.selected circle {
    stroke: #FFD700 !important;
    stroke-width: 4px !important;
  }
  .graph-edge { cursor: pointer; }
  .graph-edge.faded { opacity: 0.1; }
  .graph-edge.highlighted {
    stroke: #2196F3 !important;
    stroke-width: 3px !important;
    opacity: 0.9 !important;
  }
`;

const getLinkEndpointId = (end: string | GraphNodeDatum): string =>
  typeof end === 'string' ? end : end.id;

/**
 * Serialize an SVG element to a downloadable PNG
 */
const exportSvgAsPng = (svgEl: SVGSVGElement, filename = 'graph-visualization.png') => {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const { width, height } = svgEl.getBoundingClientRect();
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const image = new Image();
  image.onload = () => {
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;

    const ctx = canvas.getContext('2d');
    URL.revokeObjectURL(url);
    if (!ctx) return;

    ctx.scale(scale, scale);
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
    });
  };
  image.src = url;
};

/**
 * Compute the zoom transform that fits a set of node positions inside a viewport
 */
const computeFitTransform = (
  simNodes: { x?: number; y?: number }[],
  width: number,
  height: number,
  padding = 60
) => {
  const xs = simNodes.map((n) => n.x ?? 0);
  const ys = simNodes.map((n) => n.y ?? 0);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;

  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  const scale = Math.min(3, Math.max(0.1, Math.min(width / graphWidth, height / graphHeight)));
  const translateX = width / 2 - scale * (minX + graphWidth / 2);
  const translateY = height / 2 - scale * (minY + graphHeight / 2);

  return { scale, translateX, translateY };
};

const downloadJSON = (data: unknown, filename: string) => {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

/**
 * Build and manage a D3 force-directed graph rendered into an SVG
 */
export const useForceGraph = ({
  nodes,
  edges,
  selectedNode,
  layoutConfig,
  onNodeSelect,
  onNodeDeselect,
  onEdgeSelect,
}: UseForceGraphOptions): UseForceGraphResult => {
  console.log('useForceGraph render', { nodes, edges, selectedNode });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const edgesRef = useRef<any[]>(edges);
  const [isReady, setIsReady] = useState(false);

  // Keep latest callbacks available to D3 event handlers without rebuilding the graph
  const callbacksRef = useRef({ onNodeSelect, onNodeDeselect, onEdgeSelect });
  useEffect(() => {
    callbacksRef.current = { onNodeSelect, onNodeDeselect, onEdgeSelect };
  }, [onNodeSelect, onNodeDeselect, onEdgeSelect]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Build (or rebuild) the simulation and SVG whenever the data or layout changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    setIsReady(false);
    d3.select(container).selectAll('*').remove();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const nodeTypes = getNodeTypes();
    const config = layoutConfig || getDefaultLayoutConfig();
    console.log('useForceGraph: building simulation',nodeTypes ? nodeTypes: 'unknown' ,  { width, height, config, nodes, edges });
    const radiusOf = (d: GraphNodeDatum) => (nodeTypes[d.type]?.size ?? 10) / 2;

    const simNodes: GraphNodeDatum[] = nodes.map((n) => {
      const prev = positionsRef.current.get(n.data.id);
      return {
        ...n.data,
        x: prev?.x ?? width / 2 + (Math.random() - 0.5) * 40,
        y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 40,
      };
    });

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simLinks: GraphLinkDatum[] = edges
      .map((e) => ({ ...e.data }))
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('cursor', 'grab');
    svgRef.current = svg;

    svg.append('style').text(GRAPH_STYLES);

    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');
    const linkGroup = zoomLayer.append('g').attr('class', 'links');
    const nodeGroup = zoomLayer.append('g').attr('class', 'nodes');

    const zoom = (d3 as any)
      .zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', function () {
        zoomLayer.attr('transform', (d3 as any).event.transform);
      });
    (svg as any).call(zoom);
    zoomRef.current = zoom;

    // Click on empty canvas deselects the current node
    svg.on('click', function (this: SVGSVGElement) {
      if ((d3 as any).event.target === this) {
        callbacksRef.current.onNodeDeselect?.();
      }
    });

    const link: any = linkGroup
      .selectAll('line')
      .data(simLinks, (d: any) => d.id)
      .join('line')
      .attr('class', 'graph-edge')
      .attr('stroke', '#BDBDBD')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .on('click', function (d: any) {
        (d3 as any).event.stopPropagation();
        callbacksRef.current.onEdgeSelect?.(d.id);
      });

    const node: any = nodeGroup
      .selectAll('g.graph-node')
      .data(simNodes, (d: any) => d.id)
      .join((enter: any) => {
        const g = enter.append('g').attr('class', 'graph-node');
        g.append('circle');
        g.append('text');
        return g;
      });

    node
      .select('circle')
      .attr('r', (d: GraphNodeDatum) => (d.size ? d.size / 2 : (nodeTypes[d.type]?.size ?? 40) / 2))
      .attr('fill', (d: GraphNodeDatum) => d.color ?? nodeTypes[d.type]?.color ?? '#999')
      .attr('stroke', (d: GraphNodeDatum) => '#1565C0')
      .attr('stroke-width', (d: GraphNodeDatum) => d.borderWidth ?? nodeTypes[d.type]?.borderWidth ?? 2);

    node
      .select('text')
      .text((d: GraphNodeDatum) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.32em')
      .attr('font-size', (d: GraphNodeDatum) => (d.type === 'core' ? 13 : d.type === 'evidence' ? 11 : 10))
      .attr('font-weight', (d: GraphNodeDatum) => (d.type === 'core' ? 'bold' : 'normal'))
      .attr('fill', '#fff')
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    node
      .on('click', function (d: GraphNodeDatum) {
        (d3 as any).event.stopPropagation();
        callbacksRef.current.onNodeSelect?.(d.id);
      })
      .on('mouseover', function (this: Element) {
        d3.select(this).select('circle').attr('opacity', 0.85);
      })
      .on('mouseout', function (this: Element) {
        d3.select(this).select('circle').attr('opacity', 1);
      });

    const simulation = d3
      .forceSimulation<GraphNodeDatum>(simNodes)
      .force(
        'link',
        d3
          .forceLink<GraphNodeDatum, GraphLinkDatum>(simLinks)
          .id((d) => d.id)
          .distance(config.linkDistance)
          .strength(config.linkStrength)
      )
      .force('charge', d3.forceManyBody().strength(config.chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide<GraphNodeDatum>((d) => radiusOf(d) + config.collidePadding)
      )
      .alphaDecay(config.alphaDecay)
      .velocityDecay(config.velocityDecay);
    simulationRef.current = simulation;

    const drag = (d3 as any)
      .drag()
      .on('start', (d: GraphNodeDatum) => {
        if (!(d3 as any).event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (d: GraphNodeDatum) => {
        d.fx = (d3 as any).event.x;
        d.fy = (d3 as any).event.y;
      })
      .on('end', (d: GraphNodeDatum) => {
        if (!(d3 as any).event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    (node as any).call(drag);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => (d.source as GraphNodeDatum).x ?? 0)
        .attr('y1', (d: any) => (d.source as GraphNodeDatum).y ?? 0)
        .attr('x2', (d: any) => (d.target as GraphNodeDatum).x ?? 0)
        .attr('y2', (d: any) => (d.target as GraphNodeDatum).y ?? 0);

      node.attr('transform', (d: GraphNodeDatum) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);

      simNodes.forEach((n) => {
        if (typeof n.x === 'number' && typeof n.y === 'number') {
          positionsRef.current.set(n.id, { x: n.x, y: n.y });
        }
      });
    });

    // Auto-fit the view to all nodes once the initial layout settles
    let hasAutoFitted = false;
    simulation.on('end', () => {
      if (hasAutoFitted) return;
      hasAutoFitted = true;

      const c = containerRef.current;
      const s = svgRef.current;
      const z = zoomRef.current;
      if (!c || !s || !z) return;

      const w = c.clientWidth || width;
      const h = c.clientHeight || height;
      const { scale, translateX, translateY } = computeFitTransform(simNodes, w, h);

      (s.transition().duration(300) as any).call(
        z.transform,
        d3.zoomIdentity.translate(translateX, translateY).scale(scale)
      );
    });

    setIsReady(true);

    const handleResize = () => {
      const c = containerRef.current;
      if (!c) return;
      const w = c.clientWidth || 800;
      const h = c.clientHeight || 600;
      simulation.force('center', d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, layoutConfig]);

  // Toggle selection/highlight classes without rebuilding the simulation
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
  }, [selectedNode, isReady]);

  const applyZoomScale = useCallback((factor: number) => {
    const svg = svgRef.current;
    const zoom = zoomRef.current;
    if (!svg || !zoom) return;
    (svg.transition().duration(200) as any).call(zoom.scaleBy, factor);
  }, []);

  const controller = useMemo<GraphController>(
    () => ({
      zoomIn: () => applyZoomScale(1.3),
      zoomOut: () => applyZoomScale(1 / 1.3),
      fit: () => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        const container = containerRef.current;
        const simNodes = simulationRef.current?.nodes();
        if (!svg || !zoom || !container || !simNodes?.length) return;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const { scale, translateX, translateY } = computeFitTransform(simNodes, width, height);

        (svg.transition().duration(300) as any).call(
          zoom.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(scale)
        );
      },
      center: () => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        const container = containerRef.current;
        const simNodes = simulationRef.current?.nodes();
        if (!svg || !zoom || !container || !simNodes?.length) return;

        const xs = simNodes.map((n) => n.x ?? 0);
        const ys = simNodes.map((n) => n.y ?? 0);
        const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
        const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;

        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;
        const currentTransform = d3.zoomTransform(svg.node() as SVGSVGElement);
        const k = currentTransform.k;

        (svg.transition().duration(200) as any).call(
          zoom.transform,
          d3.zoomIdentity.translate(width / 2 - k * centerX, height / 2 - k * centerY).scale(k)
        );
      },
      reset: () => {
        const svg = svgRef.current;
        const zoom = zoomRef.current;
        const simulation = simulationRef.current;
        if (!svg || !zoom) return;

        (svg.transition().duration(200) as any).call(zoom.transform, d3.zoomIdentity);
        simulation?.nodes().forEach((n) => {
          n.fx = null;
          n.fy = null;
        });
        callbacksRef.current.onNodeDeselect?.();
      },
      exportPNG: () => {
        const svgEl = svgRef.current?.node();
        if (svgEl) exportSvgAsPng(svgEl);
      },
      exportJSON: () => {
        const simNodes = simulationRef.current?.nodes() ?? [];
        // Convert nodes and edges to flat Cytoscape-compatible ElementDefinition array
        const nodes = simNodes.map((n) => ({
          data: { id: n.id, label: n.label, type: n.type, degree: n.degree, description: n.description },
        }));
        const elements = [...nodes, ...edgesRef.current];
        downloadJSON(elements, 'graph-data.json');
      },
    }),
    [applyZoomScale]
  );

  return { containerRef, isReady, controller };
};

export default useForceGraph;
