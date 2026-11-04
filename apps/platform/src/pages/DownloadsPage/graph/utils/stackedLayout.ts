/**
 * Deterministic "stacked columns" layout for the dataset schema graph: one
 * vertical lane per category, lanes side by side left to right, each lane's
 * datasets stacked top to bottom with their labels to the right of the box,
 * like a list. Edges are drawn as elliptical arcs between the nodes (see
 * `ellipticalEdgePath`), so a cross-category reference reads as an arc
 * hopping between two columns.
 *
 * Lanes are ordered centre-out by connectivity: the category with the most
 * cross-category references sits in the middle, the next ones to either side
 * of it, and the least connected at the outer edges, so the busiest arcs
 * stay short and the sparse categories don't sit between them.
 *
 * A lane that holds more datasets than the panel's aspect ratio comfortably
 * stacks is split into several sub-columns; the rows-per-sub-column count is
 * picked so the whole stack's aspect ratio lands as close as possible to the
 * panel's, and the fit transform (see fitTransform.ts) scales the result
 * into view.
 *
 * The alternative is the radial hub-and-spoke layout in `radialLayout.ts`;
 * `useGraphSimulation` switches between the two on the `layout` option.
 */

import { GraphLinkDatum, GraphNodeDatum } from '../types';
import { getLinkEndpointId, getNodeBox, truncateLabel } from './graphVisuals';

export interface LaneBand {
  category: string;
  color: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface StackedLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  lanes: LaneBand[];
}

/** The box around every lane band, with a little breathing room, for the fit */
export const stackBounds = (lanes: LaneBand[], margin = 16) =>
  lanes.length
    ? {
        minX: Math.min(...lanes.map((l) => l.left)) - margin,
        maxX: Math.max(...lanes.map((l) => l.right)) + margin,
        minY: Math.min(...lanes.map((l) => l.top)) - margin,
        maxY: Math.max(...lanes.map((l) => l.bottom)) + margin,
      }
    : null;

/** Room to the right of a box for its truncated mono label (see truncateLabel) */
const LABEL_WIDTH = 150;
/** Gap between a box and its label; keep in step with LABEL_SIDE_GAP in graphVisuals.ts */
const LABEL_GAP = 8;
/** Room at the top of a lane for its title */
const LANE_TITLE_ROOM = 34;
const LANE_PAD_X = 12;
const LANE_PAD_BOTTOM = 14;
const LANE_GAP = 20;
const ROW_GAP = 10;
/** Smallest row a node takes, so leaves don't pack tighter than their label's line height */
const MIN_ROW_HEIGHT = 18;

/** Width of the widest box in the group at its largest (selected) size, so a selection never overlaps its label */
const widestBox = (group: GraphNodeDatum[]): number =>
  group.reduce((m, n) => Math.max(m, getNodeBox('selected', n.degree).width), 0);
const rowHeight = (n: GraphNodeDatum): number =>
  Math.max(getNodeBox('default', n.degree).height, MIN_ROW_HEIGHT) + ROW_GAP;

interface Lane {
  category: string;
  color: string;
  nodes: GraphNodeDatum[];
  boxWidth: number;
  cellWidth: number;
}

/**
 * Categories ranked by how many edges leave them for another category (ties
 * broken by total degree, then name), then dealt centre-out: 1st in the
 * middle, 2nd to its right, 3rd to its left, and so on.
 */
const orderCentreOut = (byCategory: Map<string, GraphNodeDatum[]>, edges: GraphLinkDatum[]): string[] => {
  const typeOf = new Map<string, string>();
  byCategory.forEach((group, category) => group.forEach((n) => typeOf.set(n.id, category)));
  const crossEdges = new Map<string, number>();
  const degreeSum = new Map<string, number>();
  byCategory.forEach((group, category) => {
    crossEdges.set(category, 0);
    degreeSum.set(category, group.reduce((s, n) => s + (n.degree ?? 0), 0));
  });
  edges.forEach((e) => {
    const a = typeOf.get(getLinkEndpointId(e.source));
    const b = typeOf.get(getLinkEndpointId(e.target));
    if (!a || !b || a === b) return;
    crossEdges.set(a, (crossEdges.get(a) ?? 0) + 1);
    crossEdges.set(b, (crossEdges.get(b) ?? 0) + 1);
  });
  const ranked = [...byCategory.keys()].sort(
    (a, b) =>
      (crossEdges.get(b) ?? 0) - (crossEdges.get(a) ?? 0) ||
      (degreeSum.get(b) ?? 0) - (degreeSum.get(a) ?? 0) ||
      a.localeCompare(b)
  );
  const order: string[] = [];
  ranked.forEach((category, i) => {
    if (i % 2 === 0) order.push(category);
    else order.unshift(category);
  });
  return order;
};

const buildLanes = (nodes: GraphNodeDatum[], edges: GraphLinkDatum[]): Lane[] => {
  const byCategory = new Map<string, GraphNodeDatum[]>();
  nodes.forEach((n) => {
    const list = byCategory.get(n.type) ?? [];
    list.push(n);
    byCategory.set(n.type, list);
  });
  return orderCentreOut(byCategory, edges).map((category) => {
    const group = byCategory.get(category) ?? [];
    // Hubs first, then alphabetical, so the busiest nodes sit at a lane's top
    const sorted = [...group].sort(
      (a, b) => (b.degree ?? 0) - (a.degree ?? 0) || a.label.localeCompare(b.label)
    );
    const boxWidth = widestBox(sorted);
    return {
      category,
      color: sorted[0]?.color ?? '#999',
      nodes: sorted,
      boxWidth,
      cellWidth: boxWidth + LABEL_GAP + LABEL_WIDTH,
    };
  });
};

/** Split a lane's nodes into sub-columns of at most `rows` each, in order */
const subColumns = (lane: Lane, rows: number): GraphNodeDatum[][] => {
  const out: GraphNodeDatum[][] = [];
  for (let i = 0; i < lane.nodes.length; i += rows) out.push(lane.nodes.slice(i, i + rows));
  return out;
};

const columnHeight = (column: GraphNodeDatum[]): number => column.reduce((h, n) => h + rowHeight(n), 0);

const laneWidth = (lane: Lane, rows: number): number =>
  Math.max(1, Math.ceil(lane.nodes.length / rows)) * lane.cellWidth + LANE_PAD_X * 2;

const stackWidth = (lanes: Lane[], rows: number): number =>
  lanes.reduce((w, lane) => w + laneWidth(lane, rows), 0) + LANE_GAP * (lanes.length - 1);

const stackHeight = (lanes: Lane[], rows: number): number =>
  lanes.reduce(
    (h, lane) => Math.max(h, ...subColumns(lane, rows).map(columnHeight)),
    0
  ) + LANE_TITLE_ROOM + LANE_PAD_BOTTOM;

/** The rows-per-sub-column count whose stack aspect ratio is closest to the panel's */
const pickRows = (lanes: Lane[], width: number, height: number): number => {
  const most = lanes.reduce((m, l) => Math.max(m, l.nodes.length), 1);
  const panelAspect = width / Math.max(height, 1);
  let best = most;
  let bestDiff = Infinity;
  for (let rows = 1; rows <= most; rows += 1) {
    const diff = Math.abs(Math.log(stackWidth(lanes, rows) / stackHeight(lanes, rows)) - Math.log(panelAspect));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = rows;
    }
  }
  return best;
};

export const computeStackedLayout = (
  nodes: GraphNodeDatum[],
  edges: GraphLinkDatum[],
  width: number,
  height: number
): StackedLayoutResult => {
  const positions = new Map<string, { x: number; y: number }>();
  const lanes = buildLanes(nodes, edges);
  if (!lanes.length) return { positions, lanes: [] };

  const rows = pickRows(lanes, width, height);
  const totalWidth = stackWidth(lanes, rows);
  // Every lane shares one height so the bands line up as a row of columns
  const totalHeight = stackHeight(lanes, rows);
  const top = height / 2 - totalHeight / 2;
  const bottom = top + totalHeight;

  let left = width / 2 - totalWidth / 2;
  const bands: LaneBand[] = lanes.map((lane) => {
    const right = left + laneWidth(lane, rows);
    subColumns(lane, rows).forEach((column, c) => {
      // the box sits at the sub-column's left, its label runs to the right
      const x = left + LANE_PAD_X + c * lane.cellWidth + lane.boxWidth / 2;
      let cursor = top + LANE_TITLE_ROOM;
      column.forEach((n) => {
        const h = rowHeight(n);
        positions.set(n.id, { x, y: cursor + (h - ROW_GAP) / 2 });
        cursor += h;
      });
    });
    const band = { category: lane.category, color: lane.color, top, bottom, left, right };
    left = right + LANE_GAP;
    return band;
  });

  return { positions, lanes: bands };
};

/** Lane titles use the same truncation as node labels so a long category name can't run past its band */
export const laneTitle = (band: LaneBand): string => truncateLabel(band.category, 24);

export default computeStackedLayout;
