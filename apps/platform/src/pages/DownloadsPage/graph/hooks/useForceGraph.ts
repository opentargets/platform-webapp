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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { tintHex } from '../../categoryColors';
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
  exportSVG: () => void;
}

export interface GraphPointerPosition {
  x: number;
  y: number;
}

interface UseForceGraphOptions {
  nodes: any[];
  edges: any[];
  selectedNode?: string | null;
  layoutConfig?: ForceLayoutConfig;
  onNodeSelect?: (nodeId: string, position?: GraphPointerPosition) => void;
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string) => void;
  onNodeHover?: (nodeId: string | null, position?: GraphPointerPosition) => void;
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
 * Serialize an SVG element and trigger a direct .svg file download
 */
const downloadSvgFile = (svgEl: SVGSVGElement, filename = 'graph-visualization.svg') => {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const { width, height } = svgEl.getBoundingClientRect();
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
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

/**
 * Custom d3 force that orbits degree-0 (unconnected) nodes just outside the live
 * bounding radius of the connected cluster - keeps stray nodes on the cluster's
 * periphery (visible, nearby) instead of drifting far away or sitting on top of
 * connected nodes. Recomputed every tick since the cluster's shape/position
 * settles as the simulation runs.
 */
const forceIsolatedToClusterPeriphery = (strength: number, padding = 40) => {
  let nodes: GraphNodeDatum[] = [];

  const force = (alpha: number) => {
    const connected = nodes.filter((n) => (n.degree ?? 0) > 0);
    if (!connected.length) return;

    let cx = 0;
    let cy = 0;
    connected.forEach((n) => {
      cx += n.x ?? 0;
      cy += n.y ?? 0;
    });
    cx /= connected.length;
    cy /= connected.length;

    let clusterRadius = 0;
    connected.forEach((n) => {
      const dx = (n.x ?? 0) - cx;
      const dy = (n.y ?? 0) - cy;
      clusterRadius = Math.max(clusterRadius, Math.sqrt(dx * dx + dy * dy));
    });
    const targetRadius = clusterRadius + padding;

    nodes.forEach((n) => {
      if ((n.degree ?? 0) === 0) {
        const dx = (n.x ?? 0) - cx;
        const dy = (n.y ?? 0) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        const targetX = cx + (dx / dist) * targetRadius;
        const targetY = cy + (dy / dist) * targetRadius;
        n.vx = (n.vx ?? 0) + (targetX - (n.x ?? 0)) * strength * alpha;
        n.vy = (n.vy ?? 0) + (targetY - (n.y ?? 0)) * strength * alpha;
      }
    });
  };

  force.initialize = (_nodes: GraphNodeDatum[]) => {
    nodes = _nodes;
  };

  return force;
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
  onNodeHover,
}: UseForceGraphOptions): UseForceGraphResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>(null);
  const positionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const initialFitTransformRef = useRef<d3.ZoomTransform | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Keep latest callbacks available to D3 event handlers without rebuilding the graph
  const callbacksRef = useRef({ onNodeSelect, onNodeDeselect, onEdgeSelect, onNodeHover });
  useEffect(() => {
    callbacksRef.current = { onNodeSelect, onNodeDeselect, onEdgeSelect, onNodeHover };
  }, [onNodeSelect, onNodeDeselect, onEdgeSelect, onNodeHover]);

  // Build (or rebuild) the simulation and SVG whenever the data or layout changes.
  // useLayoutEffect so the initial fit transform (below) is applied before the
  // browser paints, instead of flashing at 1:1 scale and animating to the fit.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    setIsReady(false);
    d3.select(container).selectAll('*').remove();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;
    const config = layoutConfig || getDefaultLayoutConfig();

    const simNodes: GraphNodeDatum[] = nodes.map((n) => {
      const prev = positionsRef.current.get(n.data.id);
      return {
        ...n.data,
        x: prev?.x ?? width / 2 + (Math.random() - 0.5) * 40,
        y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 40,
      };
    });

    // Clamp node radius to a fixed range keyed off degree, so a handful of
    // highly-connected core entities (Disease, Target) don't dwarf everything.
    const maxDegree = Math.max(1, ...simNodes.map((d) => d.degree ?? 0));
    const radiusScale = d3.scaleSqrt().domain([0, maxDegree]).range([9, 26]);
    const radiusOf = (d: GraphNodeDatum) => radiusScale(d.degree ?? 0);

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

    // Assigned once the labels are built below; referenced by the zoom
    // handler, which only ever runs after that (on user interaction).
    let label: any = null;

    const zoom = (d3 as any)
      .zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', function () {
        const { transform } = (d3 as any).event;
        zoomLayer.attr('transform', transform);
        // Reveal the rest of the labels once zoomed in enough to read them
        label?.attr('display', (d: GraphNodeDatum) =>
          (d.degree ?? 0) >= 4 || transform.k >= 1.6 ? null : 'none'
        );
      });
    (svg as any).call(zoom);
    zoomRef.current = zoom;

    // Click on empty canvas deselects the current node
    svg.on('click', function (this: SVGSVGElement) {
      if ((d3 as any).event.target === this) {
        callbacksRef.current.onNodeDeselect?.();
      }
    });

    const EDGE_COLOR = '#D8DEE4';

    const link: any = linkGroup
      .selectAll('line')
      .data(simLinks, (d: any) => d.id)
      .join('line')
      .attr('class', 'graph-edge')
      .attr('stroke', EDGE_COLOR)
      .attr('stroke-width', 1)
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

    const strokeOf = (d: GraphNodeDatum) => d.color ?? '#999';
    const fillOf = (d: GraphNodeDatum) => tintHex(strokeOf(d), 0.14);

    node
      .select('circle')
      .attr('r', radiusOf)
      .attr('fill', fillOf)
      .attr('stroke', strokeOf)
      .attr('stroke-width', 1.5);

    label = node
      .select('text')
      .text((d: GraphNodeDatum) => (d.label.length > 20 ? `${d.label.slice(0, 19)}…` : d.label))
      .attr('text-anchor', 'middle')
      .attr('dy', (d: GraphNodeDatum) => radiusOf(d) + 14)
      .attr('font-size', 11)
      .attr('font-weight', 500)
      .attr('fill', 'rgba(0, 0, 0, 0.6)')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round')
      .attr('display', (d: GraphNodeDatum) => ((d.degree ?? 0) >= 4 ? null : 'none'))
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    node
      .on('click', function (d: GraphNodeDatum) {
        const event = (d3 as any).event;
        event.stopPropagation();
        callbacksRef.current.onNodeSelect?.(d.id, { x: event.pageX, y: event.pageY });
      })
      .on('mouseover', function (this: Element, d: GraphNodeDatum) {
        d3.select(this).select('circle').attr('opacity', 0.85);
        // Raise edges touching the hovered node to its category color,
        // fade the rest - with ~100 edges this is what keeps the graph legible.
        link
          .attr('stroke', (l: any) =>
            getLinkEndpointId(l.source) === d.id || getLinkEndpointId(l.target) === d.id
              ? strokeOf(d)
              : EDGE_COLOR
          )
          .attr('stroke-opacity', (l: any) =>
            getLinkEndpointId(l.source) === d.id || getLinkEndpointId(l.target) === d.id ? 0.9 : 0.15
          );
        const event = (d3 as any).event;
        callbacksRef.current.onNodeHover?.(d.id, { x: event.pageX, y: event.pageY });
      })
      .on('mousemove', function (d: GraphNodeDatum) {
        const event = (d3 as any).event;
        callbacksRef.current.onNodeHover?.(d.id, { x: event.pageX, y: event.pageY });
      })
      .on('mouseout', function (this: Element) {
        d3.select(this).select('circle').attr('opacity', 1);
        link.attr('stroke', EDGE_COLOR).attr('stroke-opacity', 0.6);
        callbacksRef.current.onNodeHover?.(null);
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
      .force(
        'charge',
        (d3.forceManyBody<GraphNodeDatum>().strength((d) => ((d.degree ?? 0) === 0 ? config.chargeStrength * 0.1 : config.chargeStrength)) as any)
          .distanceMax(config.linkDistance * 2)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('isolatedCluster', forceIsolatedToClusterPeriphery(0.25))
      .force(
        'collide',
        d3.forceCollide<GraphNodeDatum>((d) => radiusOf(d) + config.collidePadding)
      )
      .alphaDecay(config.alphaDecay)
      .velocityDecay(config.velocityDecay)
      .stop();
    simulationRef.current = simulation;

    // Pre-converge synchronously so the graph first paints already settled,
    // instead of animating through the chaotic/vibrating early iterations
    // where nodes start randomly placed and forces are strongest.
    const preTicks = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
    for (let i = 0; i < preTicks; i += 1) simulation.tick();

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

    const updatePositions = () => {
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
    };

    // Paint the pre-converged layout immediately, before any live ticking resumes
    updatePositions();

    // Fit the view to the pre-converged layout synchronously, before this
    // (useLayoutEffect) commit paints - so the graph appears already fitted
    // instead of starting at 1:1 scale and animating to fit afterward.
    const initialFit = computeFitTransform(simNodes, width, height);
    const initialFitTransform = d3.zoomIdentity
      .translate(initialFit.translateX, initialFit.translateY)
      .scale(initialFit.scale);
    initialFitTransformRef.current = initialFitTransform;
    (svg as any).call(zoom.transform, initialFitTransform);

    simulation.on('tick', updatePositions);

    // Resume the simulation (already settled) so drag/resize can reheat it later
    simulation.alpha(simulation.alphaMin()).restart();

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

        (svg.transition().duration(200) as any).call(
          zoom.transform,
          initialFitTransformRef.current ?? d3.zoomIdentity
        );
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
      exportSVG: () => {
        const svgEl = svgRef.current?.node();
        if (svgEl) downloadSvgFile(svgEl);
      },
    }),
    [applyZoomScale]
  );

  return { containerRef, isReady, controller };
};

export default useForceGraph;
