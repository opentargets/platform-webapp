/**
 * Deterministic radial "hub and spoke" layout for the dataset schema graph.
 *
 * The graph isn't arbitrary - it's a star schema: a handful of core entities
 * (target/disease/drug/variant/study) are referenced by many evidence and
 * attribute datasets. Placing the core entities on an inner ring and fanning
 * each hub's spokes out within that hub's own angular sector means every
 * single-hub edge shares the hub as one endpoint - and two segments sharing
 * an endpoint can never cross each other. That's what keeps the graph's
 * edges from crossing, standing in for the free-form d3 force simulation
 * this replaced (see `useGraphSimulation`). Datasets referencing 2+ hubs are
 * pushed to a further ring at the angular midpoint between those hubs, so
 * their extra edge has room to arc around the single-hub fans instead of
 * cutting through them - those are the only edges not fully crossing-free.
 *
 * A hub sector can hold more nodes than fit on a single arc without
 * overlapping, so `fanGroup` below spreads a large group across several
 * concentric bands (still all within the same angular sector, so the
 * crossing-free property above is unaffected by which band a node lands on).
 * Nodes render as boxes sized by degree (see graphVisuals.ts), so every
 * spacing check here is computed per-group off each group's own largest box
 * rather than a single graph-wide constant - a hub with mostly low-degree
 * (small-boxed) children stays compact instead of inheriting the spacing
 * only the single biggest node anywhere in the graph actually needs.
 *
 * Every radius here is elliptical (rx, ry independently derived from the
 * panel's own width/height), which is what reorients the whole layout to
 * favor whichever dimension the panel actually has more of - wide when the
 * panel's wide, tall when it's tall. That only holds if every *subsequent*
 * step out from the center keeps the same rx:ry ratio the base ring used,
 * so band/tier gaps below split their magnitude across X and Y
 * proportionally to (rx, ry) rather than growing by an isotropic pixel
 * constant, which would otherwise flatten the layout back toward circular.
 */

import { GraphLinkDatum, GraphNodeDatum } from '../types';
import { getLinkEndpointId, getNodeHalfDiagonal } from './graphVisuals';
import { CORE_ENTITIES } from './nodeClassifier';

export interface RadialLayoutResult {
  positions: Map<string, { x: number; y: number }>;
  hubIds: Set<string>;
}

const HUB_FALLBACK_COUNT = 5;
// Extra clearance kept between two nodes' circumscribing circles, on top of
// their own half-diagonals.
const SPACING_PADDING = 8;

const minSpacingFor = (group: GraphNodeDatum[]): number => {
  const maxDiag = group.reduce((m, n) => Math.max(m, getNodeHalfDiagonal(n.size)), getNodeHalfDiagonal());
  return 2 * (maxDiag + SPACING_PADDING);
};

/** Smallest radius at which `count` items evenly spaced around a full circle keep at least `minSpacing` between neighbours */
const ringRadiusForCount = (count: number, minSpacing: number, fallback: number): number =>
  count > 1 ? Math.max(fallback, minSpacing / (2 * Math.sin(Math.PI / count))) : fallback;

/** Core entities by id where possible; falls back to the most-connected nodes for data that doesn't use those ids (e.g. test fixtures) */
const pickHubs = (nodes: GraphNodeDatum[]): GraphNodeDatum[] => {
  const known = nodes.filter((n) => CORE_ENTITIES.has(n.id.toLowerCase()));
  if (known.length > 0) return known;
  return [...nodes]
    .filter((n) => (n.degree ?? 0) > 0)
    .sort((a, b) => (b.degree ?? 0) - (a.degree ?? 0))
    .slice(0, Math.min(HUB_FALLBACK_COUNT, nodes.length));
};

/**
 * Places `group` within the angular wedge [baseAngle - spread/2, baseAngle +
 * spread/2], starting at radius (rx, ry) from (cx, cy). If more nodes need to
 * fit than a single arc can hold without overlapping (per this group's own
 * box sizes), the group spills onto additional concentric bands, spaced out
 * by this group's own minimum spacing, until everything fits. Returns the
 * (rx, ry) actually reached by the outermost band, so the caller knows where
 * it's safe to start the next tier.
 */
const fanGroup = (
  group: GraphNodeDatum[],
  positions: Map<string, { x: number; y: number }>,
  cx: number,
  cy: number,
  baseAngle: number,
  spread: number,
  rx: number,
  ry: number
): { rx: number; ry: number } => {
  const sorted = [...group].sort((a, b) => a.label.localeCompare(b.label));
  if (sorted.length === 0) return { rx, ry };
  if (sorted.length === 1) {
    positions.set(sorted[0].id, { x: cx + rx * Math.cos(baseAngle), y: cy + ry * Math.sin(baseAngle) });
    return { rx, ry };
  }

  const minSpacing = minSpacingFor(sorted);
  // A step's *magnitude* is floored at minSpacing (nodes must never end up
  // closer than that), but its X/Y split follows the (rx, ry) ellipse this
  // ring started from - a plain per-axis floor (max(rx*0.35, minSpacing) and
  // max(ry*0.35, minSpacing) independently) would collapse toward an
  // isotropic step for any group needing several bands, since minSpacing is
  // a fixed pixel value that doesn't know the container's aspect ratio - and
  // busy hubs commonly need several bands, so that was quietly overriding
  // the elliptical shape the base ring got right.
  const avgR = (rx + ry) / 2;
  const ringStep = Math.max(avgR * 0.35, minSpacing);
  const ringGapX = ringStep * (rx / avgR);
  const ringGapY = ringStep * (ry / avgR);

  // Minimum angular gap so two adjacent nodes on the same (innermost, most
  // conservative) arc keep this group's own minimum spacing: chord = 2 * r * sin(gap/2).
  const minGap = 2 * Math.asin(Math.min(1, minSpacing / (2 * avgR)));
  const maxPerRing = Math.max(2, Math.floor(spread / minGap) + 1);
  const ringCount = Math.ceil(sorted.length / maxPerRing);

  let idx = 0;
  let lastRx = rx;
  let lastRy = ry;
  for (let ring = 0; ring < ringCount; ring += 1) {
    const remaining = sorted.length - idx;
    const ringsLeft = ringCount - ring;
    const countInRing = Math.ceil(remaining / ringsLeft);
    lastRx = rx + ring * ringGapX;
    lastRy = ry + ring * ringGapY;
    for (let i = 0; i < countInRing; i += 1) {
      const t = countInRing === 1 ? 0.5 : i / (countInRing - 1);
      const angle = baseAngle - spread / 2 + t * spread;
      const n = sorted[idx];
      positions.set(n.id, { x: cx + lastRx * Math.cos(angle), y: cy + lastRy * Math.sin(angle) });
      idx += 1;
    }
  }
  return { rx: lastRx, ry: lastRy };
};

export const computeRadialLayout = (
  nodes: GraphNodeDatum[],
  edges: GraphLinkDatum[],
  width: number,
  height: number
): RadialLayoutResult => {
  const cx = width / 2;
  const cy = height / 2;
  // Elliptical (not circular) radii so the layout's own aspect ratio already
  // matches the container's, instead of needing a separate post-hoc stretch.
  // Floors are kept small - just enough to avoid a degenerate near-zero
  // radius on a tiny container - so a genuinely narrow or short panel can
  // still compress that axis rather than being forced back toward square.
  let hubRx = Math.max(width * 0.13, 50);
  let hubRy = Math.max(height * 0.13, 50);
  const spokeRx = Math.max(width * 0.2, 70);
  const spokeRy = Math.max(height * 0.2, 70);

  const positions = new Map<string, { x: number; y: number }>();
  const hubs = pickHubs(nodes);
  const hubIds = new Set(hubs.map((h) => h.id));
  const hubAngle = new Map<string, number>();

  // Hubs are laid out on a simple full-circle ring (not through `fanGroup`),
  // so their own minimum spacing has to be checked separately here.
  const hubMinSpacing = minSpacingFor(hubs);
  hubRx = ringRadiusForCount(hubs.length, hubMinSpacing, hubRx);
  hubRy = ringRadiusForCount(hubs.length, hubMinSpacing, hubRy);

  hubs.forEach((hub, i) => {
    const angle = (i / hubs.length) * 2 * Math.PI - Math.PI / 2;
    hubAngle.set(hub.id, angle);
    positions.set(hub.id, { x: cx + hubRx * Math.cos(angle), y: cy + hubRy * Math.sin(angle) });
  });

  // Direct hub reference(s) and general neighbours for every node
  const connectedHubs = new Map<string, Set<string>>();
  const neighbors = new Map<string, Set<string>>();
  nodes.forEach((n) => {
    connectedHubs.set(n.id, new Set());
    neighbors.set(n.id, new Set());
  });
  edges.forEach((e) => {
    const source = getLinkEndpointId(e.source);
    const target = getLinkEndpointId(e.target);
    if (hubIds.has(source) && !hubIds.has(target)) connectedHubs.get(target)?.add(source);
    if (hubIds.has(target) && !hubIds.has(source)) connectedHubs.get(source)?.add(target);
    neighbors.get(source)?.add(target);
    neighbors.get(target)?.add(source);
  });

  const sectorWidth = (2 * Math.PI) / Math.max(hubs.length, 1);
  const singleHubGroups = new Map<string, GraphNodeDatum[]>();
  const multiHubGroups = new Map<string, GraphNodeDatum[]>();
  let unplaced: GraphNodeDatum[] = [];

  nodes.forEach((n) => {
    if (hubIds.has(n.id)) return;
    const hubsFor = connectedHubs.get(n.id) ?? new Set();
    if (hubsFor.size === 1) {
      const hubId = [...hubsFor][0];
      const list = singleHubGroups.get(hubId) ?? [];
      list.push(n);
      singleHubGroups.set(hubId, list);
    } else if (hubsFor.size > 1) {
      const key = [...hubsFor].sort().join('|');
      const list = multiHubGroups.get(key) ?? [];
      list.push(n);
      multiHubGroups.set(key, list);
    } else {
      unplaced.push(n);
    }
  });

  // Single-hub nodes: fanned out (across as many bands as needed) within
  // their hub's own sector - every edge in the fan shares the hub as an
  // endpoint, so none of them can cross regardless of which band they're on.
  let maxSingleReachX = spokeRx;
  let maxSingleReachY = spokeRy;
  singleHubGroups.forEach((group, hubId) => {
    const baseAngle = hubAngle.get(hubId) ?? 0;
    const usable = sectorWidth * 0.8;
    const reach = fanGroup(group, positions, cx, cy, baseAngle, usable, spokeRx, spokeRy);
    maxSingleReachX = Math.max(maxSingleReachX, reach.rx);
    maxSingleReachY = Math.max(maxSingleReachY, reach.ry);
  });

  // Multi-hub nodes: one tier further out than the deepest single-hub band
  // actually used, at the circular mean angle of the hubs they reference -
  // gives their extra edge(s) room to arc around the single-hub fans rather
  // than cut through them. The gap's X/Y split follows the single-hub tier's
  // own (possibly elliptical) reach, for the same reason `fanGroup`'s ring
  // step does - a flat isotropic gap would flatten the aspect ratio back out.
  const avgSingleReach = (maxSingleReachX + maxSingleReachY) / 2;
  const tierGap = minSpacingFor(nodes);
  const multiRx = maxSingleReachX + tierGap * (maxSingleReachX / avgSingleReach);
  const multiRy = maxSingleReachY + tierGap * (maxSingleReachY / avgSingleReach);
  // Only reserve the multi-hub tier's gap when there's actually a multi-hub
  // group to place there - otherwise this tier sits empty and the isolated
  // ring below (which starts one further tierGap past *this* value) ends up
  // two tier-gaps past the single-hub fan instead of one, needlessly
  // stranding isolated nodes far from the rest of the graph.
  let maxMultiReachX = multiHubGroups.size > 0 ? multiRx : maxSingleReachX;
  let maxMultiReachY = multiHubGroups.size > 0 ? multiRy : maxSingleReachY;
  multiHubGroups.forEach((group, key) => {
    const hubsFor = key.split('|');
    const sin = hubsFor.reduce((s, id) => s + Math.sin(hubAngle.get(id) ?? 0), 0);
    const cos = hubsFor.reduce((s, id) => s + Math.cos(hubAngle.get(id) ?? 0), 0);
    const meanAngle = Math.atan2(sin, cos);
    const spread = sectorWidth * 0.5;
    const reach = fanGroup(group, positions, cx, cy, meanAngle, spread, multiRx, multiRy);
    maxMultiReachX = Math.max(maxMultiReachX, reach.rx);
    maxMultiReachY = Math.max(maxMultiReachY, reach.ry);
  });

  // Anything left has no direct hub reference (only references other
  // evidence/attribute datasets) - settle it near the average of its
  // already-placed neighbours, pushed a little further from center. Repeated
  // a few times since some neighbours may depend on an earlier pass first.
  for (let pass = 0; pass < 3 && unplaced.length > 0; pass += 1) {
    const stillUnplaced: GraphNodeDatum[] = [];
    unplaced.forEach((node) => {
      const placedNeighbors = [...(neighbors.get(node.id) ?? [])]
        .map((id) => positions.get(id))
        .filter((p): p is { x: number; y: number } => Boolean(p));
      if (placedNeighbors.length === 0) {
        stillUnplaced.push(node);
        return;
      }
      const avgX = placedNeighbors.reduce((s, p) => s + p.x, 0) / placedNeighbors.length;
      const avgY = placedNeighbors.reduce((s, p) => s + p.y, 0) / placedNeighbors.length;
      const dx = avgX - cx;
      const dy = avgY - cy;
      positions.set(node.id, { x: cx + dx * 1.12, y: cy + dy * 1.12 });
    });
    unplaced = stillUnplaced;
  }

  // Fully isolated (no edges at all) or unreachable from any hub - outermost
  // ring (starting just past the deepest multi-hub band), evenly spaced
  // around the full circle so they never overlap each other. Grown further
  // out if there are enough of them that the base radius can't fit them all.
  // The gap past the multi-hub band only needs to clear these nodes' own
  // footprint, sized off `sortedRest` itself - not `tierGap`, which is sized
  // to the single largest node anywhere in the *whole* graph (a size-80 hub
  // box) and would strand every isolated node far from the rest of the
  // layout regardless of how small they actually are.
  const avgMultiReach = (maxMultiReachX + maxMultiReachY) / 2;
  const sortedRest = unplaced.sort((a, b) => a.label.localeCompare(b.label));
  const isolatedMinSpacing = minSpacingFor(sortedRest);
  const isolatedGap = isolatedMinSpacing / 2;
  const baseIsolatedRx = maxMultiReachX + isolatedGap * (maxMultiReachX / avgMultiReach);
  const baseIsolatedRy = maxMultiReachY + isolatedGap * (maxMultiReachY / avgMultiReach);
  const isolatedRx = ringRadiusForCount(sortedRest.length, isolatedMinSpacing, baseIsolatedRx);
  const isolatedRy = ringRadiusForCount(sortedRest.length, isolatedMinSpacing, baseIsolatedRy);
  sortedRest.forEach((n, i) => {
    const angle = sortedRest.length ? (i / sortedRest.length) * 2 * Math.PI : 0;
    positions.set(n.id, { x: cx + isolatedRx * Math.cos(angle), y: cy + isolatedRy * Math.sin(angle) });
  });

  // Fanning nodes across a wide angular arc adds spread in both directions
  // no matter which way a given hub's own angle leans, so the elliptical
  // radii above bias the result toward the panel's shape without exactly
  // matching it - some axis is left with slack once the whole thing is
  // uniformly scaled to fit. Stretching (never compressing) the shorter-than-
  // needed axis so the final bounding box's aspect ratio exactly matches the
  // panel's removes that slack, the same corrective step the old force
  // simulation used to apply (see git history), just run once here instead
  // of after every tick.
  const xs = Array.from(positions.values(), p => p.x);
  const ys = Array.from(positions.values(), p => p.y);
  const dataWidth = Math.max(Math.max(...xs) - Math.min(...xs), 1);
  const dataHeight = Math.max(Math.max(...ys) - Math.min(...ys), 1);
  const containerAspect = width / height;
  const dataAspect = dataWidth / dataHeight;
  const stretchX = dataAspect < containerAspect ? containerAspect / dataAspect : 1;
  const stretchY = dataAspect > containerAspect ? dataAspect / containerAspect : 1;
  if (stretchX !== 1 || stretchY !== 1) {
    positions.forEach((p, id) => {
      positions.set(id, { x: cx + (p.x - cx) * stretchX, y: cy + (p.y - cy) * stretchY });
    });
  }

  return { positions, hubIds };
};

export default computeRadialLayout;
