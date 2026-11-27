/**
 * D3 force-simulation configuration.
 *
 * The layout itself is the deterministic stacked-lanes placement in
 * `stackedLayout.ts`; the simulation only holds nodes at those targets, so
 * all that is left to tune is how quickly it settles.
 */

export interface ForceLayoutConfig {
  /** Simulation cooling rate */
  alphaDecay: number;
  /** Simulation friction */
  velocityDecay: number;
}

/**
 * Get the base force-simulation parameters
 */
export const getLayoutConfig = (): ForceLayoutConfig => ({
  alphaDecay: 0.02,
  velocityDecay: 0.35,
});

/**
 * Get default layout options (used as fallback)
 */
export const getDefaultLayoutConfig = (): ForceLayoutConfig => getLayoutConfig();

export default {
  getLayoutConfig,
  getDefaultLayoutConfig,
};
