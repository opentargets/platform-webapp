/**
 * Hook: useGraphLayout
 * Base D3 force-simulation parameters (cooling/friction).
 *
 * Panel-size responsiveness lives in useGraphSimulation instead of here - it
 * measures the graph panel's own container via ResizeObserver and re-derives
 * the stacked layout for it (see stackedLayout.ts).
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
