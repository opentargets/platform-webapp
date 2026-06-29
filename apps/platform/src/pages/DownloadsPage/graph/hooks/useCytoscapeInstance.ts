/**
 * Hook: useCytoscapeInstance
 * Manages Cytoscape lifecycle: initialization, updates, and cleanup
 */

import { useEffect, useRef, useState } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { getStylesheet } from '../utils/styleConfig';
import { getLayoutConfig } from '../utils/layoutConfig';

// Note: cytoscape-cose-bilkent can be optionally installed for better layout
// For now, we'll use the built-in 'cose' layout which provides good results

interface UseCytoscapeOptions {
  nodes: any[];
  edges: any[];
  layoutConfig?: any;
  container?: HTMLElement | null;
}

interface UseCytoscapeResult {
  cy: Core | null;
  containerRef: React.RefObject<HTMLDivElement>;
  isReady: boolean;
}

/**
 * Initialize and manage Cytoscape instance lifecycle
 */
export const useCytoscapeInstance = ({
  nodes,
  edges,
  layoutConfig,
  container,
}: UseCytoscapeOptions): UseCytoscapeResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize Cytoscape on mount
  useEffect(() => {
    const targetContainer = container || containerRef.current;
    if (!targetContainer) return;

    try {
      // Create Cytoscape instance
      cyRef.current = cytoscape({
        container: targetContainer,
        style: getStylesheet(),
        elements: { nodes, edges },
        layout: layoutConfig || getLayoutConfig({ nodeCount: nodes.length }),
        wheelSensitivity: 0.1,
        minZoom: 0.1,
        maxZoom: 3,
      });

      setIsReady(true);

      // Handle resize
      const handleResize = () => {
        if (cyRef.current) {
          cyRef.current.resize();
          cyRef.current.fit(undefined, 50);
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    } catch (error) {
      console.error('Error initializing Cytoscape:', error);
      return undefined;
    }
  }, []);

  // Update nodes/edges when they change
  useEffect(() => {
    if (!cyRef.current || !isReady) return;

    try {
      // Remove all existing elements
      cyRef.current.elements().remove();

      // Add new elements
      cyRef.current.add([...nodes, ...edges]);

      // Re-run layout
      if (layoutConfig) {
        cyRef.current.layout(layoutConfig).run();
      }
    } catch (error) {
      console.error('Error updating Cytoscape elements:', error);
    }
  }, [nodes, edges, isReady]);

  // Fit to view when layout finishes
  useEffect(() => {
    if (!cyRef.current || !isReady) return;

    const fitView = () => {
      if (cyRef.current) {
        cyRef.current.fit(undefined, 50);
      }
    };

    cyRef.current.one('layoutstop', fitView);

    return () => {
      if (cyRef.current) {
        cyRef.current.off('layoutstop', fitView);
      }
    };
  }, [isReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, []);

  return {
    cy: cyRef.current,
    containerRef,
    isReady,
  };
};

export default useCytoscapeInstance;
