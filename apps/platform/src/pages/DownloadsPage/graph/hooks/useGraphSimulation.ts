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

    // Mutable so `handleResize` (below) can re-center the already-settled
    // layout by translation, without reheating the simulation.
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;
    const config = layoutConfig || getDefaultLayoutConfig();

    const simNodes: GraphNodeDatum[] = nodes.map((n) => {
      const prev = positionsRef.current.get(n.data.id);
      return {
        ...n.data,
        x: prev?.x ?? width / 2 + (Math.random() - 0.5) * 40,
        y: prev?.y ?? height / 2 + (Math.random() - 0.5) * 40,
      };
    });

    const NODE_RADIUS = 14;

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
      .attr('stroke-width', 2)
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
      .attr('r', NODE_RADIUS)
      .attr('fill', fillOf)
      .attr('stroke', strokeOf)
      .attr('stroke-width', 1.5);

    label = node
      .select('text')
      .text((d: GraphNodeDatum) => (d.label.length > 20 ? `${d.label.slice(0, 19)}…` : d.label))
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_RADIUS + 14)
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
        callbacksRef.current?.onNodeSelect?.(d.id, { x: event.clientX, y: event.clientY });
      })
      .on('mouseover', function (d: GraphNodeDatum) {
        const event = (d3 as any).event;
        callbacksRef.current?.onNodeHover?.(d.id, { x: event.clientX, y: event.clientY });
      })
      .on('mousemove', function (d: GraphNodeDatum) {
        const event = (d3 as any).event;
        callbacksRef.current?.onNodeHover?.(d.id, { x: event.clientX, y: event.clientY });
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
        d3.forceCollide<GraphNodeDatum>(NODE_RADIUS + config.collidePadding)
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

    // The radial forces above (charge/link/center) have no directional bias,
    // so the settled layout comes out roughly circular regardless of the
    // container's shape. Fitting a circular blob into a wide-but-short (or
    // tall-but-narrow) panel then bottlenecks on the tighter axis, leaving
    // the other mostly empty. `applyAspectStretch` stretches node positions
    // (never compresses) so the layout's bounding box matches whatever the
    // panel's current aspect ratio is - recomputed on every resize (see
    // `handleResize` below) so dragging the split divider or resizing the
    // window keeps re-optimizing for the space actually available, in
    // whichever dimension grew. It's driven off `basePositions` (the
    // unstretched, pre-convergence layout) rather than the current node
    // positions, so repeated resizes re-derive the stretch from scratch
    // instead of compounding on top of a previous stretch.
    const basePositions = new Map(simNodes.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
    const MAX_STRETCH = 3;
    const applyAspectStretch = (w: number, h: number) => {
      const xs = Array.from(basePositions.values(), (p) => p.x);
      const ys = Array.from(basePositions.values(), (p) => p.y);
      const graphWidth = Math.max(Math.max(...xs) - Math.min(...xs), 1);
      const graphHeight = Math.max(Math.max(...ys) - Math.min(...ys), 1);
      const containerAspect = w / h;
      const graphAspect = graphWidth / graphHeight;
      const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
      const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
      const stretchX = graphAspect < containerAspect ? Math.min(containerAspect / graphAspect, MAX_STRETCH) : 1;
      const stretchY = graphAspect > containerAspect ? Math.min(graphAspect / containerAspect, MAX_STRETCH) : 1;

      simNodes.forEach((n) => {
        const base = basePositions.get(n.id);
        if (!base) return;
        n.x = cx + (base.x - cx) * stretchX;
        n.y = cy + (base.y - cy) * stretchY;
      });
    };
    applyAspectStretch(width, height);

    // The simulation is frozen after its initial layout (see below) - dragging
    // just repositions the one node directly, with no physics pushback on its
    // neighbours and no reheating of the simulation. Tracked so a later
    // resize's auto-refit (see `handleResize`) doesn't clobber a manually
    // dragged node back to its pre-drag, aspect-stretched position.
    let userDraggedNode = false;
    const drag = (d3 as any).drag().on('drag', (d: GraphNodeDatum) => {
      userDraggedNode = true;
      d.x = (d3 as any).event.x;
      d.y = (d3 as any).event.y;
      updatePositions();
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

    // Paint the pre-converged layout. The simulation is never resumed after
    // this - it stays frozen (see `.stop()` above) so nothing but an explicit
    // drag ever moves a node again, and selecting/hovering/resizing never
    // triggers force-driven motion.
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

    setIsReady(true);

    // On resize (e.g. the card grid narrowing when a node is selected, or the
    // split divider being dragged), re-derive the aspect stretch for the new
    // panel shape and re-fit to it - so growing the panel in either
    // dimension keeps spreading nodes to use the extra space, not just
    // recentering the old layout. That re-fit is only applied if the view is
    // still exactly where the last auto-fit left it: if the user has since
    // zoomed or panned by hand, their view is preserved as before, just
    // recentered by panning (the pan, not the raw node coordinates, has to
    // move: node screen position is `k * x + translate`, so nudging `x` only
    // shifts the screen by `k * dx` at the current zoom scale - panning by
    // `dx` directly is what keeps the layout centered at any zoom level).
    const handleResize = () => {
      const c = containerRef.current;
      if (!c) return;
      const w = c.clientWidth || 800;
      const h = c.clientHeight || 600;
      if (w === width && h === height) return;

      const current = (d3 as any).zoomTransform(svg.node());
      const lastAutoFit = initialFitTransformRef.current;
      const hasCustomView =
        userDraggedNode ||
        !lastAutoFit ||
        Math.abs(current.k - lastAutoFit.k) > 1e-6 ||
        Math.abs(current.x - lastAutoFit.x) > 0.5 ||
        Math.abs(current.y - lastAutoFit.y) > 0.5;

      const dx = w / 2 - width / 2;
      const dy = h / 2 - height / 2;
      width = w;
      height = h;
      svg.attr('viewBox', `0 0 ${w} ${h}`);

      if (hasCustomView) {
        if (dx !== 0 || dy !== 0) {
          const next = d3.zoomIdentity.translate(current.x + dx, current.y + dy).scale(current.k);
          (svg as any).call(zoom.transform, next);
        }
        return;
      }

      applyAspectStretch(w, h);
      updatePositions();
      const fit = computeFitTransform(simNodes, w, h);
      const nextTransform = d3.zoomIdentity.translate(fit.translateX, fit.translateY).scale(fit.scale);
      initialFitTransformRef.current = nextTransform;
      (svg as any).call(zoom.transform, nextTransform);
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
