/**
 * D3 force-simulation layout configuration
 * Provides force parameters tuned for a hub-and-spoke topology
 */

export interface ForceLayoutConfig {
  /** d3.forceManyBody() strength (negative = repulsion) */
  chargeStrength: number;
  /** d3.forceLink() target distance */
  linkDistance: number;
  /** d3.forceLink() strength */
  linkStrength: number;
  /** Extra spacing added to d3.forceCollide() radius */
  collidePadding: number;
  /** Simulation cooling rate */
  alphaDecay: number;
  /** Simulation friction */
  velocityDecay: number;
}

interface LayoutOptions {
  nodeCount?: number;
  edgeCount?: number;
}

interface ViewportSize {
  width?: number;
  height?: number;
}

/**
 * Get force-simulation parameters scaled to the size of the graph
 */
export const getLayoutConfig = ({
  nodeCount = 50,
  edgeCount = 100,
}: LayoutOptions = {}): ForceLayoutConfig => {
  // Larger graphs need more repulsion and longer links to avoid crowding
  const chargeStrength = -Math.min(1200, 250 + nodeCount * 12);
  const linkDistance = Math.min(220, 90 + edgeCount / 4);

  return {
    chargeStrength,
    linkDistance,
    linkStrength: 0.4,
    collidePadding: 12,
    alphaDecay: 0.02,
    velocityDecay: 0.35,
  };
};

/**
 * Adjust the layout for small viewports (tighter spacing, faster settle)
 */
export const getResponsiveLayoutConfig = ({
  width = 800,
}: ViewportSize = {}): Partial<ForceLayoutConfig> => {
  const isSmallScreen = width < 600;

  return isSmallScreen
    ? { chargeStrength: -200, linkDistance: 70, collidePadding: 6 }
    : {};
};

/**
 * Get default layout options (used as fallback)
 */
export const getDefaultLayoutConfig = (): ForceLayoutConfig =>
  getLayoutConfig({ nodeCount: 50, edgeCount: 100 });

export default {
  getLayoutConfig,
  getResponsiveLayoutConfig,
  getDefaultLayoutConfig,
};
