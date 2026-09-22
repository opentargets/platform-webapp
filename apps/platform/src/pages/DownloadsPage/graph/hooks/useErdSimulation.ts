/**
 * Hook: useErdSimulation
 * Renders the schema-diagram canvas: one database-table card per dataset
 * (header + a row per field) connected by per-field foreign-key lines.
 * Positioned with the same deterministic radial hub-and-spoke layout the
 * main force graph uses (see radialLayout.ts) - just fed each card's real
 * field-count-driven box size instead of a degree bucket (see erdLayout.ts).
 *
 * Reuses the main graph's `.graph-node`/`.graph-edge`/`.graph-edge-hit`
 * class names (and GRAPH_STYLES) so `useFilterHighlight` and the fade CSS
 * work unchanged - see useErdGraph, which composes this with that hook and
 * with the shared `useGraphController` for the zoom/fit/export toolbar.
 *
 * Note: like useGraphSimulation, this runs against the d3 v5 API the
 * workspace resolves at runtime (event listeners read `d3.event`), not the
 * v6+ convention the `@types/d3` typings describe - hence the `d3 as any` casts.
 */

import { useLayoutEffect, useState } from 'react';
import * as d3 from 'd3';
import { computeRadialLayout } from '../utils/radialLayout';
import { computeFitTransform } from '../utils/fitTransform';
import { erdEdgePath } from '../utils/edgePath';
import { getDefaultLayoutConfig, getResponsiveLayoutConfig, ForceLayoutConfig } from '../utils/layoutConfig';
import { GRAPH_STYLES } from '../utils/graphVisuals';
import {
  getErdNodeBoxSize,
  getErdHalfDiagonal,
  syntheticSizeFor,
  roundedTopRectPath,
  ERD_HEADER_HEIGHT,
  ERD_ROW_HEIGHT,
} from '../utils/erdLayout';
import { GraphPointerPosition } from '../types';

interface ErdCallbacks {
  onNodeDeselect?: () => void;
  onEdgeSelect?: (edgeId: string, position?: GraphPointerPosition) => void;
  onEdgeHover?: (edgeId: string | null, position?: GraphPointerPosition) => void;
}

interface UseErdSimulationOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.MutableRefObject<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>;
  zoomRef: React.MutableRefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
  simulationRef: React.MutableRefObject<d3.Simulation<any, any> | null>;
  positionsRef: React.MutableRefObject<Map<string, { x: number; y: number }>>;
  initialFitTransformRef: React.MutableRefObject<d3.ZoomTransform | null>;
  callbacksRef: React.RefObject<ErdCallbacks>;
  nodes: any[];
  edges: any[];
  layoutConfig?: ForceLayoutConfig;
}

const KEY_DOT_COLOR = '#D4AC0D';
const FK_DOT_COLOR = '#9AA5B1';
const ROW_DIVIDER_COLOR = '#EEF0F2';
// Deeper/more opaque than the main graph's EDGE_COLOR (#D8DEE4) - that hairline
// grey all but disappears once the layout's real footprint pushes the default
// zoom down, and a database diagram's connectors are meant to read clearly.
const ERD_EDGE_COLOR = '#8A94A6';
const ERD_EDGE_OPACITY = 0.85;
const ERD_EDGE_FADED_OPACITY = 0.15;
// The layout's full-fit scale is often tiny (a 61-table, wildly-different-sized
// diagram doesn't fit legibly in one screen) - the initial view (and "reset
// view") floor out at a readable zoom instead, trading "see everything at once"
// for "see something at once", the way a real ERD tool's default view would.
const MIN_INITIAL_SCALE = 0.6;

/** Raises a computed fit's scale to `minScale` if it falls short, re-deriving translate to keep the same center point */
const withMinScale = (
  fit: { scale: number; translateX: number; translateY: number },
  width: number,
  height: number,
  minScale: number
) => {
  if (fit.scale >= minScale) return fit;
  const centerX = (width / 2 - fit.translateX) / fit.scale;
  const centerY = (height / 2 - fit.translateY) / fit.scale;
  return {
    scale: minScale,
    translateX: width / 2 - minScale * centerX,
    translateY: height / 2 - minScale * centerY,
  };
};

export const useErdSimulation = ({
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
}: UseErdSimulationOptions): boolean => {
  const [isReady, setIsReady] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    setIsReady(false);
    d3.select(container).selectAll('*').remove();

    let width = container.clientWidth || 1000;
    let height = container.clientHeight || 700;
    const config = { ...(layoutConfig || getDefaultLayoutConfig()), ...getResponsiveLayoutConfig(width) };

    const simNodes: any[] = nodes.map((n) => ({ ...n.data, x: 0, y: 0 }));

    const neighborSets = new Map<string, Set<string>>(simNodes.map((n) => [n.id, new Set<string>()]));
    edges.forEach((e) => {
      neighborSets.get(e.data.source)?.add(e.data.target);
      neighborSets.get(e.data.target)?.add(e.data.source);
    });
    simNodes.forEach((n) => {
      n.degree = neighborSets.get(n.id)?.size ?? 0;
    });

    const nodeIds = new Set(simNodes.map((n) => n.id));
    const simLinks: any[] = edges
      .map((e) => ({ ...e.data }))
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Every table starts collapsed to just the fields that actually
    // participate in a connector - either end of it - so the default view
    // reads as a compact relationship map rather than a wall of columns;
    // clicking a card reveals the rest of its fields (see toggleCollapse).
    const connectingFieldsByNode = new Map<string, Set<string>>(simNodes.map((n) => [n.id, new Set<string>()]));
    simLinks.forEach((e) => {
      connectingFieldsByNode.get(e.source)?.add(e.sourceField);
      connectingFieldsByNode.get(e.target)?.add(e.targetField);
    });
    simNodes.forEach((n) => {
      n.connectingFieldNames = connectingFieldsByNode.get(n.id) ?? new Set<string>();
      n.collapsed = true;
      const collapsedFieldCount = n.connectingFieldNames.size;
      n.box = getErdNodeBoxSize(collapsedFieldCount);
      // Feeds radialLayout's spacing math (expects the main graph's degree-bucket scale)
      n.size = syntheticSizeFor(collapsedFieldCount);
    });

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

    const zoom = (d3 as any)
      .zoom()
      .scaleExtent([0.1, 3])
      .on('zoom', function () {
        const { transform } = (d3 as any).event;
        zoomLayer.attr('transform', transform);
      });
    (svg as any).call(zoom);
    zoomRef.current = zoom;

    // Click on empty canvas closes a pinned edge tooltip
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
      .attr('stroke', ERD_EDGE_COLOR)
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', ERD_EDGE_OPACITY)
      .style('pointer-events', 'none');

    // Invisible, much wider stroke on top of each edge purely to catch pointer events
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
        g.append('rect').attr('class', 'erd-body');
        g.append('path').attr('class', 'erd-header');
        g.append('text').attr('class', 'erd-title');
        g.append('g').attr('class', 'erd-rows');
        return g;
      });

    // The fields actually drawn for a card - every connecting field while
    // collapsed (the default), all of them once expanded. Shared by the
    // renderer and by rowAnchorY, so a connector always points at whichever
    // row is really on screen.
    const visibleFieldsOf = (n: any): any[] =>
      n.collapsed ? n.fields.filter((f: any) => n.connectingFieldNames.has(f.name)) : n.fields;

    // A card's internal layout (header, body, field rows) depends only on
    // its own field count and collapsed state, not on the simulation - drawn
    // here rather than on every tick, and re-run for just the one card a
    // click toggles (see toggleCollapse) rather than the whole canvas.
    const renderNodeCard = (g: any, d: any) => {
      const visibleFields = visibleFieldsOf(d);
      d.box = getErdNodeBoxSize(visibleFields.length);
      const { width: w, height: h } = d.box;
      const x = -w / 2;
      const y = -h / 2;

      g.select('rect.erd-body')
        .attr('x', x)
        .attr('y', y)
        .attr('width', w)
        .attr('height', h)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('fill', '#fff')
        .attr('stroke', d.color)
        .attr('stroke-width', 1.5);

      g.select('path.erd-header')
        .attr('d', roundedTopRectPath(x, y, w, ERD_HEADER_HEIGHT, 6))
        .attr('fill', d.color);

      const chevron = d.collapsed ? '▸' : '▾';
      const maxTitleChars = 30 - chevron.length;
      const title = d.label.length > maxTitleChars ? `${d.label.slice(0, maxTitleChars - 1)}…` : d.label;
      g.select('text.erd-title')
        .attr('x', 0)
        .attr('y', y + ERD_HEADER_HEIGHT / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-size', 13)
        .attr('font-weight', 600)
        .attr('fill', '#fff')
        .style('pointer-events', 'none')
        .style('user-select', 'none')
        .text(`${chevron} ${title}`)
        .append('title')
        .text(d.label);

      const rows: any = g
        .select('g.erd-rows')
        .selectAll('g.erd-row')
        .data(visibleFields, (f: any) => f.name)
        .join((rowEnter: any) => {
          const row = rowEnter.append('g').attr('class', 'erd-row');
          row.append('line');
          row.append('circle');
          row.append('text').attr('class', 'erd-field-name');
          row.append('text').attr('class', 'erd-field-type');
          return row;
        });

      rows.each(function (this: SVGGElement, f: any, i: number) {
        const rowY = y + ERD_HEADER_HEIGHT + i * ERD_ROW_HEIGHT;
        const r = d3.select(this);

        r.select('line')
          .attr('x1', x)
          .attr('x2', x + w)
          .attr('y1', rowY)
          .attr('y2', rowY)
          .attr('stroke', ROW_DIVIDER_COLOR)
          .attr('stroke-width', 1);

        const keyTitle = f.isKey ? 'Primary key' : f.isForeign ? 'Foreign key' : null;
        const circleSel = r
          .select('circle')
          .attr('cx', x + 14)
          .attr('cy', rowY + ERD_ROW_HEIGHT / 2)
          .attr('r', 3)
          .attr('fill', f.isKey ? KEY_DOT_COLOR : 'none')
          .attr('stroke', f.isKey ? KEY_DOT_COLOR : f.isForeign ? FK_DOT_COLOR : 'none')
          .attr('stroke-width', 1.5);
        if (keyTitle) circleSel.append('title').text(keyTitle);

        r.select('text.erd-field-name')
          .attr('x', x + 24)
          .attr('y', rowY + ERD_ROW_HEIGHT / 2 + 4)
          .attr('font-size', 11.5)
          .attr('font-family', 'monospace')
          .attr('font-weight', f.isKey ? 700 : 400)
          .attr('fill', '#26313d')
          .style('pointer-events', 'none')
          .style('user-select', 'none')
          .text(f.name.length > 22 ? `${f.name.slice(0, 21)}…` : f.name);

        r.select('text.erd-field-type')
          .attr('x', x + w - 10)
          .attr('y', rowY + ERD_ROW_HEIGHT / 2 + 4)
          .attr('text-anchor', 'end')
          .attr('font-size', 10)
          .attr('fill', '#9AA5B1')
          .style('pointer-events', 'none')
          .style('user-select', 'none')
          .text(f.dataType);
      });
    };

    node.each(function (this: SVGGElement, d: any) {
      renderNodeCard(d3.select(this), d);
    });

    // Hovering a card raises its own connectors and dims the rest, so the
    // canvas stays legible with ~130 field-level connectors on screen.
    const setHoverState = (hoverId: string | null) => {
      if (!hoverId) {
        node.classed('hover-faded', false);
        link
          .classed('hover-faded', false)
          .classed('hover-highlighted', false)
          .attr('stroke-opacity', ERD_EDGE_OPACITY);
        return;
      }
      const endpointId = (end: any) => (typeof end === 'object' ? end.id : end);
      const isTouching = (d: any) => endpointId(d.source) === hoverId || endpointId(d.target) === hoverId;

      const neighbors = new Set<string>([hoverId]);
      simLinks.forEach((d: any) => {
        if (isTouching(d)) {
          neighbors.add(endpointId(d.source));
          neighbors.add(endpointId(d.target));
        }
      });

      node.classed('hover-faded', (d: any) => !neighbors.has(d.id));
      link
        .classed('hover-highlighted', isTouching)
        .classed('hover-faded', (d: any) => !isTouching(d))
        .attr('stroke-opacity', (d: any) => (isTouching(d) ? 1 : ERD_EDGE_FADED_OPACITY));
    };

    node.on('mouseover', (d: any) => setHoverState(d.id)).on('mouseout', () => setHoverState(null));

    // Clicking a card expands/collapses it in place - the box grows around
    // its current center (no re-layout), so its own connectors just need
    // rerouting to the new row positions (updatePositions, defined below;
    // safe to reference here since this handler only runs on a later click).
    node.on('click', function (this: SVGGElement, d: any) {
      const event = (d3 as any).event;
      event.stopPropagation();
      d.collapsed = !d.collapsed;
      const g = d3.select(this);
      renderNodeCard(g, d);
      if (!d.collapsed) g.raise();
      updatePositions();
    });

    // `link` is kept purely so d3 resolves each link's string source/target
    // into references to the actual node objects - strength 0 means it never
    // pulls nodes around, matching useGraphSimulation's own use of this trick.
    const simulation = d3
      .forceSimulation<any>(simNodes)
      .force('link', d3.forceLink<any, any>(simLinks).id((d: any) => d.id).strength(0))
      .force('x', d3.forceX<any>((d: any) => radialLayout.positions.get(d.id)?.x ?? width / 2).strength(0.85))
      .force('y', d3.forceY<any>((d: any) => radialLayout.positions.get(d.id)?.y ?? height / 2).strength(0.85))
      .force(
        'collide',
        d3.forceCollide<any>((d: any) => getErdHalfDiagonal(d.connectingFieldNames.size) + config.collidePadding)
      )
      .alphaDecay(config.alphaDecay)
      .velocityDecay(config.velocityDecay)
      .stop();
    simulationRef.current = simulation;

    const preTicks = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay()));
    for (let i = 0; i < preTicks; i += 1) simulation.tick();

    const drag = (d3 as any).drag().on('drag', (d: any) => {
      d.x = (d3 as any).event.x;
      d.y = (d3 as any).event.y;
      updatePositions();
    });
    (node as any).call(drag);

    const rowAnchorY = (n: any, fieldName: string): number => {
      const idx = visibleFieldsOf(n).findIndex((f: any) => f.name === fieldName);
      const top = (n.y ?? 0) - n.box.height / 2;
      return idx < 0 ? top + ERD_HEADER_HEIGHT / 2 : top + ERD_HEADER_HEIGHT + idx * ERD_ROW_HEIGHT + ERD_ROW_HEIGHT / 2;
    };

    const updatePositions = () => {
      const edgePathOf = (d: any) => {
        const source = d.source as any;
        const target = d.target as any;
        const sx = source.x ?? 0;
        const tx = target.x ?? 0;
        const goingRight = tx >= sx;
        const x1 = sx + (goingRight ? source.box.width / 2 : -source.box.width / 2);
        const x2 = tx + (goingRight ? -target.box.width / 2 : target.box.width / 2);
        return erdEdgePath(x1, rowAnchorY(source, d.sourceField), x2, rowAnchorY(target, d.targetField));
      };
      link.attr('d', edgePathOf);
      linkHit.attr('d', edgePathOf);

      node.attr('transform', (d: any) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);

      simNodes.forEach((n) => {
        if (typeof n.x === 'number' && typeof n.y === 'number') {
          positionsRef.current.set(n.id, { x: n.x, y: n.y });
        }
      });
    };

    updatePositions();

    // Table cards vary hugely in height (a 3-field dataset vs. a 38-field
    // one), so the fit padding is derived from the largest card actually
    // present rather than a fixed constant.
    const maxHalfW = Math.max(...simNodes.map((n) => n.box.width / 2), 50);
    const maxHalfH = Math.max(...simNodes.map((n) => n.box.height / 2), 50);
    const fitPadding = Math.max(maxHalfW, maxHalfH) + 40;

    const initialFit = withMinScale(computeFitTransform(simNodes, width, height, fitPadding), width, height, MIN_INITIAL_SCALE);
    const initialFitTransform = d3.zoomIdentity
      .translate(initialFit.translateX, initialFit.translateY)
      .scale(initialFit.scale);
    initialFitTransformRef.current = initialFitTransform;
    (svg as any).call(zoom.transform, initialFitTransform);

    setIsReady(true);

    const handleResize = () => {
      const c = containerRef.current;
      if (!c) return;
      const w = c.clientWidth || 1000;
      const h = c.clientHeight || 700;
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

      const fit = withMinScale(computeFitTransform(simNodes, w, h, fitPadding), w, h, MIN_INITIAL_SCALE);
      initialFitTransformRef.current = d3.zoomIdentity.translate(fit.translateX, fit.translateY).scale(fit.scale);

      const scale = Math.min(3, Math.max(0.1, fit.scale * zoomMultiple));
      const centerX = (w / 2 - fit.translateX) / fit.scale;
      const centerY = (h / 2 - fit.translateY) / fit.scale;
      const nextTransform = d3.zoomIdentity
        .translate(w / 2 - scale * centerX, h / 2 - scale * centerY)
        .scale(scale);
      (svg as any).call(zoom.transform, nextTransform);
    };
    window.addEventListener('resize', handleResize);

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

export default useErdSimulation;
