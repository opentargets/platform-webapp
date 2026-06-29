/**
 * Hook: useGraphLayout
 * Manages graph layout configuration and layout switching
 */

import { useMemo, useCallback, useState } from 'react';
import { getLayoutConfig, LAYOUT_PRESETS, getResponsiveLayoutConfig } from '../utils/layoutConfig';

type LayoutMode = 'cose' | 'cola' | 'hierarchical' | 'radial';

interface UseGraphLayoutOptions {
  nodeCount?: number;
  edgeCount?: number;
  defaultLayoutMode?: LayoutMode;
  responsive?: boolean;
}

interface LayoutState {
  currentLayout: LayoutMode;
  layoutConfig: any;
  setLayoutMode: (mode: LayoutMode) => void;
  resetLayout: () => void;
}

/**
 * Manage and switch between different graph layouts
 */
export const useGraphLayout = ({
  nodeCount = 50,
  edgeCount = 100,
  defaultLayoutMode = 'cose-bilkent',
  responsive = true,
}: UseGraphLayoutOptions = {}): LayoutState => {
  const [currentLayout, setCurrentLayout] = useState<LayoutMode>(defaultLayoutMode);

  // Get viewport dimensions for responsive layout
  const viewportSize = useMemo(() => {
    if (typeof window === 'undefined') {
      return { width: 800, height: 600 };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, []);

  // Generate layout configuration
  const layoutConfig = useMemo(() => {
    let config: any;

    // Get base layout config
    switch (currentLayout) {
      case 'cose':
        config = getLayoutConfig({
          nodeCount,
          edgeCount,
          layoutMode: 'cose',
          animate: true,
        });
        break;

      case 'cola':
        config = getLayoutConfig({
          nodeCount,
          edgeCount,
          layoutMode: 'cola',
          animate: true,
        });
        break;

      case 'hierarchical':
        config = LAYOUT_PRESETS.hierarchical();
        break;

      case 'radial':
        config = LAYOUT_PRESETS.radial();
        break;

      default:
        config = getLayoutConfig({
          nodeCount,
          edgeCount,
          layoutMode: 'cose',
        });
    }

    // Apply responsive adjustments if enabled
    if (responsive) {
      const responsiveAdjustments = getResponsiveLayoutConfig(viewportSize);
      config = { ...config, ...responsiveAdjustments };
    }

    return config;
  }, [currentLayout, nodeCount, edgeCount, responsive, viewportSize]);

  // Switch layout mode
  const setLayoutMode = useCallback((mode: LayoutMode) => {
    setCurrentLayout(mode);
  }, []);

  // Reset to default layout
  const resetLayout = useCallback(() => {
    setCurrentLayout(defaultLayoutMode);
  }, [defaultLayoutMode]);

  return {
    currentLayout,
    layoutConfig,
    setLayoutMode,
    resetLayout,
  };
};

/**
 * Get available layout options
 */
export const getAvailableLayouts = (): Array<{
  id: LayoutMode;
  name: string;
  description: string;
}> => [
  {
    id: 'cose',
    name: 'Force-Directed',
    description: 'Physics-based layout for organic positioning',
  },
  {
    id: 'cola',
    name: 'Cola',
    description: 'Constraint-based layout with edge straightness',
  },
  {
    id: 'hierarchical',
    name: 'Hierarchical',
    description: 'Tree-like layout with levels',
  },
  {
    id: 'radial',
    name: 'Radial',
    description: 'Concentric circles from center outward',
  },
];

export default useGraphLayout;
