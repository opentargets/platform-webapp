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
import { getDefaultLayoutConfig, getResponsiveLayoutConfig, ForceLayoutConfig } from '../utils/layoutConfig';
import { computeRadialLayout } from '../utils/radialLayout';
import { computeFitTransform } from '../utils/fitTransform';
import { curvedEdgePath } from '../utils/edgePath';
import {
  GRAPH_STYLES,
  EDGE_COLOR,
  strokeOf,
  getNodeBoxSize,
  getNodeHalfDiagonal,
  truncateLabel,
} from '../utils/graphVisuals';
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

    // Mutable so `handleResize` (below) can re-lay-out for the new size
    // without reheating the simulation.
    let width = container.clientWidth || 800;
    let height = container.clientHeight || 600;
    // Tighter collision padding on a narrow panel - based on this panel's
    // own measured width, not the browser window (see getResponsiveLayoutConfig).
    const config = { ...(layoutConfig || getDefaultLayoutConfig()), ...getResponsiveLayoutConfig(width) };

    const simNodes: GraphNodeDatum[] = nodes.map((n) => ({ ...n.data, x: 0, y: 0 }));

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simLinks: GraphLinkDatum[] = edges
      .map((e) => ({ ...e.data }))
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Deterministic hub-and-spoke target positions (see radialLayout.ts) -
    // seed every node straight at its target (or its last dragged/settled
    // position, so re-renders don't jump) rather than a random scatter, so
    // the graph paints already laid out instead of animating from chaos.
    let radialLayout = computeRadialLayout(simNodes, simLinks, width, height);
    simNodes.forEach((n) => {
      const prev = positionsRef.current.get(n.id);
      const target = radialLayout.positions.get(n.id) ?? { x: width / 2, y: height / 2 };
      n.x = prev?.x ?? target.x;
      n.y = prev?.y ?? target.y;
    });

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
      .selectAll('path.graph-edge')
      .data(simLinks, (d: any) => d.id)
      .join('path')
      .attr('class', 'graph-edge')
      .attr('fill', 'none')
      .attr('stroke', EDGE_COLOR)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .style('pointer-events', 'none');

    // Invisible, much wider stroke on top of each edge purely to catch
    // pointer events - the visible 2px edge is too thin to hover or click.
    const linkHit: any = linkGroup
      .selectAll('path.graph-edge-hit')
      .data(simLinks, (d: any) => d.id)
      .join('path')
      .attr('class', 'graph-edge-hit')
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 12)
      .style('cursor', 'pointer')
      .on('click', function (d: any) {
        const event = (d3 as any).event;
        event.stopPropagation();
        callbacksRef.current?.onEdgeSelect?.(d.id, { x: event.clientX, y: event.clientY });
      })
      .on('mouseover', function (d: any) {
        const event = (d3 as any).event;
        link.filter((l: any) => l.id === d.id).classed('edge-active', true);
        callbacksRef.current?.onEdgeHover?.(d.id, { x: event.clientX, y: event.clientY });
      })
      .on('mousemove', function (d: any) {
        const event = (d3 as any).event;
        callbacksRef.current?.onEdgeHover?.(d.id, { x: event.clientX, y: event.clientY });
      })
      .on('mouseout', function (d: any) {
        link.filter((l: any) => l.id === d.id).classed('edge-active', false);
        callbacksRef.current?.onEdgeHover?.(null);
      });

    const node: any = nodeGroup
      .selectAll('g.graph-node')
      .data(simNodes, (d: any) => d.id)
      .join((enter: any) => {
        const g = enter.append('g').attr('class', 'graph-node');
        g.append('rect');
        g.append('text');
        return g;
      });

    const fillOf = (d: GraphNodeDatum) => lightenHex(strokeOf(d), 0.25);

    // Rounded-rectangle "card" per node (like an ER-diagram table) rather
    // than a circle, since each node represents a dataset - sized by degree
    // (via `size`, computed by nodeClassifier.enrichNodesWithClassification)
    // so hubs and other heavily-referenced datasets stand out as bigger
    // boxes. The label lives outside the box, not inside it (see below).
    node
      .select('rect')
      .attr('width', (d: GraphNodeDatum) => getNodeBoxSize(d.size).width)
      .attr('height', (d: GraphNodeDatum) => getNodeBoxSize(d.size).height)
      .attr('x', (d: GraphNodeDatum) => -getNodeBoxSize(d.size).width / 2)
      .attr('y', (d: GraphNodeDatum) => -getNodeBoxSize(d.size).height / 2)
      .attr('rx', 5)
      .attr('ry', 5)
      .attr('fill', fillOf)
      .attr('stroke', strokeOf)
      .attr('stroke-width', 1.5);

    // Labels sit below the box rather than inside it - most stay hidden
    // until zoomed in (see the zoom handler above), only high-degree hub
    // nodes are labelled by default, so ~50 always-on labels don't turn the
    // graph into unreadable clutter at the initial fit.
    label = node
      .select('text')
      .text((d: GraphNodeDatum) => truncateLabel(d.label))
      .attr('text-anchor', 'middle')
      .attr('dy', (d: GraphNodeDatum) => getNodeBoxSize(d.size).height / 2 + 14)
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

    // `link` is kept purely so d3 resolves each link's string source/target
    // into references to the actual node objects (what the highlight hooks
    // and `updatePositions` below expect) - strength 0 means it never pulls
    // nodes around; the radial layout above already decided where they go.
    // `collide` is the only thing still allowed to move a node off its
    // target, and only to nudge apart two nodes placed too close within the
    // same hub sector.
    const simulation = d3
      .forceSimulation<GraphNodeDatum>(simNodes)
      .force('link', d3.forceLink<GraphNodeDatum, GraphLinkDatum>(simLinks).id((d) => d.id).strength(0))
      .force(
        'x',
        d3.forceX<GraphNodeDatum>((d) => radialLayout.positions.get(d.id)?.x ?? width / 2).strength(0.85)
      )
      .force(
        'y',
        d3.forceY<GraphNodeDatum>((d) => radialLayout.positions.get(d.id)?.y ?? height / 2).strength(0.85)
      )
      .force(
        'collide',
        d3.forceCollide<GraphNodeDatum>((d) => getNodeHalfDiagonal(d.size) + config.collidePadding)
      )
      .alphaDecay(config.alphaDecay)
      .velocityDecay(config.velocityDecay)
      .stop();
    simulationRef.current = simulation;

    // Pre-converge synchronously so the graph first paints already settled,
    // instead of animating through the early iterations where any collided
    // nodes are still being nudged apart.
    const preTicks = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
    for (let i = 0; i < preTicks; i += 1) simulation.tick();

    // The simulation is frozen after its initial layout (see below) - dragging
    // just repositions the one node directly, with no physics pushback on its
    // neighbours and no reheating of the simulation.
    const drag = (d3 as any).drag().on('drag', (d: GraphNodeDatum) => {
      d.x = (d3 as any).event.x;
      d.y = (d3 as any).event.y;
      updatePositions();
    });
    (node as any).call(drag);

    const updatePositions = () => {
      const edgePath = (d: any) => {
        const source = d.source as GraphNodeDatum;
        const target = d.target as GraphNodeDatum;
        return curvedEdgePath(source.x ?? 0, source.y ?? 0, target.x ?? 0, target.y ?? 0);
      };
      link.attr('d', edgePath);
      linkHit.attr('d', edgePath);

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

    // On every resize (window, split divider, or the card grid changing the
    // panel's height) re-derive the radial layout for the new panel shape and
    // re-fit to it - so the graph keeps adapting to the space available even
    // after the user has zoomed, panned, or dragged a node. The user's zoom
    // level is kept as a multiple of the auto-fit scale (so a zoomed-in view
    // stays proportionally zoomed in as the panel changes shape), but pan
    // and dragged-node positions can't be carried across a re-layout and are
    // reset to the new fit.
    const handleResize = () => {
      const c = containerRef.current;
      if (!c) return;
      const w = c.clientWidth || 800;
      const h = c.clientHeight || 600;
      if (w === width && h === height) return;

      const current = (d3 as any).zoomTransform(svg.node());
      const lastAutoFit = initialFitTransformRef.current;
      const zoomMultiple = lastAutoFit ? current.k / lastAutoFit.k : 1;

      width = w;
      height = h;
      svg.attr('viewBox', `0 0 ${w} ${h}`);

      radialLayout = computeRadialLayout(simNodes, simLinks, w, h);
      simNodes.forEach((n) => {
        const target = radialLayout.positions.get(n.id);
        if (!target) return;
        n.x = target.x;
        n.y = target.y;
      });
      updatePositions();

      const fit = computeFitTransform(simNodes, w, h);
      initialFitTransformRef.current = d3.zoomIdentity
        .translate(fit.translateX, fit.translateY)
        .scale(fit.scale);

      // Keep the fit's centre point in the middle of the panel at the user's
      // zoom multiple.
      const scale = Math.min(3, Math.max(0.1, fit.scale * zoomMultiple));
      const centerX = (w / 2 - fit.translateX) / fit.scale;
      const centerY = (h / 2 - fit.translateY) / fit.scale;
      const nextTransform = d3.zoomIdentity
        .translate(w / 2 - scale * centerX, h / 2 - scale * centerY)
        .scale(scale);
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
