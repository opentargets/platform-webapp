/**
 * Hook: useGraphLayout
 * Base D3 force-simulation parameters (collision padding, cooling/friction).
 *
 * Panel-size responsiveness lives in useGraphSimulation instead of here - it
 * measures the graph panel's own container via ResizeObserver (see
 * getResponsiveLayoutConfig in layoutConfig.ts) and drives the actual
 * width/height-adaptive layout (see radialLayout.ts), rather than this hook
 * reading the browser window's size, which can be much larger than the
 * panel itself once the cards/graph split divider is dragged.
 */

import { useMemo } from 'react';
import { getLayoutConfig, ForceLayoutConfig } from '../utils/layoutConfig';

interface LayoutState {
  layoutConfig: ForceLayoutConfig;
}

export const useGraphLayout = (): LayoutState => {
  const layoutConfig = useMemo(() => getLayoutConfig(), []);
  return { layoutConfig };
};

export default useGraphLayout;
