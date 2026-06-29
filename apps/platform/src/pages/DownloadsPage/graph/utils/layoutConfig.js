/**
 * Cytoscape layout configuration
 * Provides force-directed layout options optimized for hub-and-spoke topology
 */

/**
 * Get optimized layout configuration based on data size
 * @param {Object} options - Configuration options
 * @param {number} options.nodeCount - Number of nodes in the graph
 * @param {number} options.edgeCount - Number of edges in the graph
 * @param {string} options.layoutMode - Layout algorithm: 'cose-bilkent' (default) or 'cola'
 * @param {boolean} options.animate - Whether to animate layout (default: true)
 * @returns {Object} Cytoscape layout configuration
 */
export const getLayoutConfig = ({
  nodeCount = 50,
  edgeCount = 100,
  layoutMode = 'cose-bilkent',
  animate = true,
} = {}) => {
  // Scale parameters based on graph size
  const nodeSpacing = Math.max(5, 50 - nodeCount / 2);
  const iterations = Math.min(nodeCount * 50, 5000);

  const baseConfig = {
    name: layoutMode,
    directed: false,
    animate: animate,
    animationDuration: 500,
    avoidOverlap: true,
    nodeSpacing: nodeSpacing,
    numIter: iterations,
    tile: true,
    tilingPaddingVertical: 10,
    tilingPaddingHorizontal: 10,
    randomize: false,
    stop: () => {
      // Callback when layout finishes
    },
  };

  // Layout-specific configurations
  if (layoutMode === 'cose-bilkent') {
    return {
      ...baseConfig,
      // cose-bilkent specific options
      gravity: -2000,
      gravityRange: 150,
      movementThreshold: 0.1,
      relativeTolerance: 0.01,
      initialTemp: 200,
      cooling: 0.95,
      minTemp: 1,
      // Edge elasticity based on average degree
      edgeElasticity: 0.7,
      nestingFactor: 0.1,
      improveFlow: true,
      flow: {
        usePhysics: true,
        mass: 1,
        spacing: 20,
      },
    };
  }

  if (layoutMode === 'cola') {
    return {
      ...baseConfig,
      // cola specific options
      flow: {
        usePhysics: true,
      },
      alignment: undefined,
      gapCycleCompensation: true,
      handleDisconnected: true,
    };
  }

  return baseConfig;
};

/**
 * Get responsive layout configuration based on viewport size
 * @param {Object} viewport - Viewport dimensions
 * @param {number} viewport.width - Viewport width in pixels
 * @param {number} viewport.height - Viewport height in pixels
 * @returns {Object} Responsive layout configuration adjustments
 */
export const getResponsiveLayoutConfig = ({ width = 800, height = 600 } = {}) => {
  const area = width * height;
  const isSmallScreen = width < 600;

  return {
    avoidOverlap: true,
    nodeSpacing: isSmallScreen ? 10 : 20,
    animate: !isSmallScreen, // Disable animation on small screens for performance
    randomize: isSmallScreen,
  };
};

/**
 * Get default layout options (used as fallback)
 * @returns {Object} Default layout configuration
 */
export const getDefaultLayoutConfig = () =>
  getLayoutConfig({
    nodeCount: 50,
    edgeCount: 100,
    layoutMode: 'cose-bilkent',
    animate: true,
  });

/**
 * Layout preset configurations for quick switching
 */
export const LAYOUT_PRESETS = {
  balanced: () =>
    getLayoutConfig({
      nodeCount: 50,
      layoutMode: 'cose-bilkent',
      animate: true,
    }),

  fast: () =>
    getLayoutConfig({
      nodeCount: 50,
      layoutMode: 'cose-bilkent',
      animate: false,
    }),

  hierarchical: () => ({
    name: 'breadthFirstSearch',
    directed: true,
    roots: '#target, #disease',
    animate: true,
    animationDuration: 500,
  }),

  radial: () => ({
    name: 'concentric',
    directed: false,
    minNodeSpacing: 50,
    animate: true,
    animationDuration: 500,
    concentric: (node) => {
      // Place core entities at center
      const nodeType = node.data('type');
      return nodeType === 'core' ? 3 : nodeType === 'evidence' ? 2 : 1;
    },
    levelWidth: () => 100,
  }),
};

export default {
  getLayoutConfig,
  getResponsiveLayoutConfig,
  getDefaultLayoutConfig,
  LAYOUT_PRESETS,
};
