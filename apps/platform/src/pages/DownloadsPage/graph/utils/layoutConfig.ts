/**
 * D3 force-simulation layout configuration.
 *
 * The layout itself is now the deterministic radial hub-and-spoke placement
 * in `radialLayout.ts` - what's left for the simulation to tune is just the
 * local collision-avoidance pass (nodes nudging apart when a hub sector gets
 * crowded) and how quickly it settles.
 */

export interface ForceLayoutConfig {
  /** Extra spacing added to d3.forceCollide() radius */
  collidePadding: number;
  /** Simulation cooling rate */
  alphaDecay: number;
  /** Simulation friction */
  velocityDecay: number;
}

/**
 * Get the base force-simulation parameters
 */
export const getLayoutConfig = (): ForceLayoutConfig => ({
  collidePadding: 8,
  alphaDecay: 0.02,
  velocityDecay: 0.35,
});

/**
 * Tighter collision padding for a narrow graph panel, so a compact panel
 * doesn't waste as much space per node. Takes the graph panel's own measured
 * width (see useGraphSimulation, which tracks it reactively via
 * ResizeObserver) - not the browser window, which can be much wider than the
 * panel actually is (e.g. after the cards/graph split divider is dragged).
 */
export const getResponsiveLayoutConfig = (panelWidth: number): Partial<ForceLayoutConfig> =>
  panelWidth < 600 ? { collidePadding: 4 } : {};

/**
 * Get default layout options (used as fallback)
 */
export const getDefaultLayoutConfig = (): ForceLayoutConfig => getLayoutConfig();

export default {
  getLayoutConfig,
  getResponsiveLayoutConfig,
  getDefaultLayoutConfig,
};
