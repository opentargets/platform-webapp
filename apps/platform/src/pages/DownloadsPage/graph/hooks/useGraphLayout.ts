/**
 * Hook: useGraphLayout
 * Computes D3 force-simulation parameters, adapting to graph size and viewport
 */

import { useMemo } from 'react';
import {
  getLayoutConfig,
  getResponsiveLayoutConfig,
  ForceLayoutConfig,
} from '../utils/layoutConfig';

interface UseGraphLayoutOptions {
  nodeCount?: number;
  edgeCount?: number;
  responsive?: boolean;
}

interface LayoutState {
  layoutConfig: ForceLayoutConfig;
}

/**
 * Build a force-simulation layout configuration for the current graph
 */
export const useGraphLayout = ({
  nodeCount = 50,
  edgeCount = 100,
  responsive = true,
}: UseGraphLayoutOptions = {}): LayoutState => {
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

  // Generate layout configuration, scaled to graph size and viewport
  const layoutConfig = useMemo(() => {
    const config = getLayoutConfig({ nodeCount, edgeCount });

    if (responsive) {
      return { ...config, ...getResponsiveLayoutConfig(viewportSize) };
    }

    return config;
  }, [nodeCount, edgeCount, responsive, viewportSize]);

  return { layoutConfig };
};

export default useGraphLayout;

