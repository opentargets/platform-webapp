/**
 * Hook: useGraphData
 * Transforms downloads data into graph nodes and edges with proper classification
 */

import { useMemo } from 'react';
import { transformDownloadsToGraph } from '../utils/dataTransformer';
import getMockGraphData from '../utils/mockSchema';

interface UseGraphDataOptions {
  downloadsData?: any;
  useMockData?: boolean;
}

interface GraphDataResult {
  nodes: any[];
  edges: any[];
  loading: boolean;
  error: Error | null;
}

/**
 * Transform raw downloads data into Cytoscape-compatible graph structure
 */
export const useGraphData = ({
  downloadsData,
  useMockData = false,
}: UseGraphDataOptions = {}): GraphDataResult => {
  const graphData = useMemo(() => {
    try {
      // Use mock data if requested or if no real data provided
      if (useMockData || !downloadsData) {
        return getMockGraphData();
      }

      // Handle array of downloads
      if (Array.isArray(downloadsData)) {
        return transformDownloadsToGraph(
          downloadsData.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
          }))
        );
      }

      // Handle object with downloads property
      if (downloadsData && typeof downloadsData === 'object') {
        const datasets = downloadsData.downloads || downloadsData.data || [];
        return transformDownloadsToGraph(datasets);
      }

      // Fallback to mock data
      return getMockGraphData();
    } catch (error) {
      console.error('Error transforming graph data:', error);
      return getMockGraphData();
    }
  }, [downloadsData, useMockData]);

  return {
    nodes: graphData.nodes,
    edges: graphData.edges,
    loading: false,
    error: null,
  };
};

export default useGraphData;
