/**
 * Custom d3 forces used by `useGraphSimulation` to shape the layout beyond
 * what the stock link/charge/collide forces provide.
 */

import { GraphNodeDatum } from '../types';

/**
 * Custom d3 force that orbits degree-0 (unconnected) nodes just outside the live
 * bounding radius of the connected cluster - keeps stray nodes on the cluster's
 * periphery (visible, nearby) instead of drifting far away or sitting on top of
 * connected nodes. Recomputed every tick since the cluster's shape/position
 * settles as the simulation runs.
 */
export const forceIsolatedToClusterPeriphery = (strength: number, padding = 40) => {
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
 * Custom d3 force that pulls each (connected) node toward the centroid of the
 * other nodes sharing its `type` (the dataset category, also what drives node
 * color) - loosely clumping same-category nodes together without overriding
 * the link/charge layout. Isolated (degree-0) nodes are left to
 * `forceIsolatedToClusterPeriphery` instead. Centroids are recomputed every
 * tick since they drift as the simulation settles.
 */
export const forceCluster = (strength: number) => {
  let nodes: GraphNodeDatum[] = [];

  const force = (alpha: number) => {
    const centroids = new Map<string, { x: number; y: number; count: number }>();

    nodes.forEach((n) => {
      if ((n.degree ?? 0) === 0) return;
      const centroid = centroids.get(n.type) ?? { x: 0, y: 0, count: 0 };
      centroid.x += n.x ?? 0;
      centroid.y += n.y ?? 0;
      centroid.count += 1;
      centroids.set(n.type, centroid);
    });

    nodes.forEach((n) => {
      if ((n.degree ?? 0) === 0) return;
      const centroid = centroids.get(n.type);
      if (!centroid || centroid.count <= 1) return;
      const targetX = centroid.x / centroid.count;
      const targetY = centroid.y / centroid.count;
      n.vx = (n.vx ?? 0) + (targetX - (n.x ?? 0)) * strength * alpha;
      n.vy = (n.vy ?? 0) + (targetY - (n.y ?? 0)) * strength * alpha;
    });
  };

  force.initialize = (_nodes: GraphNodeDatum[]) => {
    nodes = _nodes;
  };

  return force;
};
