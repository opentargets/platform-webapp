/**
 * Hook: useGraphSimulation
 * Builds (and rebuilds, on data/layout change) the D3 simulation and SVG:
 * nodes, links, zoom/pan, drag, and the node click/hover event wiring.
 * Populates the svg/zoom/simulation/positions refs owned by `useForceGraph`
 * and reports readiness once the initial layout has settled and painted.
 *
 * Note: the workspace resolves the `d3` package to v5 at runtime (even though
 * `@types/d3` ships v7 typings), so event listeners here use the d3 v5
 * calling convention - `(d, i)` with the native event read from `d3.event` -
 * rather than the newer v6+ `(event, d)` convention. `d3 as any` casts are
 * used where the v7 typings disagree with the actual v5 runtime API.
 */

import { useLayoutEffect, useState } from 'react';
import * as d3 from 'd3';
import { lightenHex } from '../../categoryColors';
import { getDefaultLayoutConfig, ForceLayoutConfig } from '../utils/layoutConfig';
import { forceIsolatedToClusterPeriphery, forceCluster } from '../utils/forces';
import { computeFitTransform } from '../utils/fitTransform';
import { GRAPH_STYLES, EDGE_COLOR, strokeOf } from '../utils/graphVisuals';
import { GraphNodeDatum, GraphLinkDatum, GraphCallbacks } from '../types';

interface UseGraphSimulationOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.MutableRefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  zoomRef: React.MutableRefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  simulationRef: React.MutableRefObject<d3.Simulation<GraphNodeDatum, GraphLinkDatum> | null>;
  positionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  initialFitTransformRef: React.MutableRefObject<d3.ZoomTransform | null>;
  callbacksRef: React.RefObject<GraphCallbacks>;
  nodes: any[];
  edges: any[];
  layoutConfig?: ForceLayoutConfig;
}

export const useGraphSimulation = ({
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
}: UseGraphSimulationOptions): boolean => {
  const [isReady, setIsReady] = useState(false);

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
        callbacksRef.current?.onNodeDeselect?.();
      }
    });

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
        callbacksRef.current?.onEdgeSelect?.(d.id);
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

    const fillOf = (d: GraphNodeDatum) => lightenHex(strokeOf(d), 0.25);

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
        callbacksRef.current?.onNodeSelect?.(d.id, { x: event.pageX, y: event.pageY });
      })
      .on('mouseover', function (d: GraphNodeDatum) {
        const event = (d3 as any).event;
        callbacksRef.current?.onNodeHover?.(d.id, { x: event.pageX, y: event.pageY });
      })
      .on('mousemove', function (d: GraphNodeDatum) {
        const event = (d3 as any).event;
        callbacksRef.current?.onNodeHover?.(d.id, { x: event.pageX, y: event.pageY });
      })
      .on('mouseout', function () {
        callbacksRef.current?.onNodeHover?.(null);
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
      .force('cluster', forceCluster(config.clusterStrength))
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
      svg.attr('viewBox', `0 0 ${w} ${h}`);
      simulation.force('center', d3.forceCenter(w / 2, h / 2));
      simulation.alpha(0.3).restart();
    };
    window.addEventListener('resize', handleResize);

    // The container's own height can change after mount independently of any
    // window resize - e.g. the two-card-rows height it's sized to (see
    // useGridRowsHeight) resolves asynchronously from an initial fallback -
    // so the simulation must re-fit to that too, not just to window resizes.
    const containerResizeObserver = new ResizeObserver(handleResize);
    containerResizeObserver.observe(container);

    return () => {
      window.removeEventListener('resize', handleResize);
      containerResizeObserver.disconnect();
      simulation.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, layoutConfig]);

  return isReady;
};
