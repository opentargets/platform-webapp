/**
 * Cytoscape layout configuration
 * Provides force-directed layout options optimized for hub-and-spoke topology
 */

interface LayoutOptions {
  nodeCount?: number;
  edgeCount?: number;
  layoutMode?: 'cose' | 'cola' | 'circle' | 'random';
  animate?: boolean;
}

interface ViewportSize {
  width?: number;
  height?: number;
}

interface BaseLayoutConfig {
  name: string;
  directed: boolean;
  animate: boolean;
  animationDuration: number;
  avoidOverlap: boolean;
  [key: string]: any;
}

/**
 * Get optimized layout configuration based on data size
 */
export const getLayoutConfig = ({
  nodeCount = 50,
  edgeCount = 100,
  layoutMode = 'cose',
  animate = true,
}: LayoutOptions = {}): BaseLayoutConfig => {
  // Scale parameters based on graph size
  const nodeSpacing = Math.max(5, 50 - nodeCount / 2);
  const iterations = Math.min(nodeCount * 50, 5000);

  const baseConfig: BaseLayoutConfig = {
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
  if (layoutMode === 'cose') {
    return {
      ...baseConfig,
      gravity: -2000,
      gravityRange: 150,
      movementThreshold: 0.1,
      relativeTolerance: 0.01,
      initialTemp: 200,
      cooling: 0.95,
      minTemp: 1,
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
 */
export const getResponsiveLayoutConfig = ({
  width = 800,
  height = 600,
}: ViewportSize = {}): Partial<BaseLayoutConfig> => {
  const isSmallScreen = width < 600;

  return {
    avoidOverlap: true,
    nodeSpacing: isSmallScreen ? 10 : 20,
    animate: !isSmallScreen,
    randomize: isSmallScreen,
  };
};

/**
 * Get default layout options (used as fallback)
 */
export const getDefaultLayoutConfig = (): BaseLayoutConfig =>
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
  balanced: (): BaseLayoutConfig =>
    getLayoutConfig({
      nodeCount: 50,
      layoutMode: 'cose',
      animate: true,
    }),

  fast: (): BaseLayoutConfig =>
    getLayoutConfig({
      nodeCount: 50,
      layoutMode: 'cose',
      animate: false,
    }),

  hierarchical: (): BaseLayoutConfig => ({
    name: 'breadthFirstSearch',
    directed: true,
    roots: '#target, #disease',
    animate: true,
    animationDuration: 500,
  }),

  radial: (): BaseLayoutConfig => ({
    name: 'concentric',
    directed: false,
    minNodeSpacing: 50,
    animate: true,
    animationDuration: 500,
    concentric: (node: any) => {
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
