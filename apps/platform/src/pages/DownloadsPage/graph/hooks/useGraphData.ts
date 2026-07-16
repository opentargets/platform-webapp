/**
 * Hook: useGraphData
 * Transforms downloads data into graph nodes and edges with proper classification
 */

import { useMemo } from 'react';
import { transformDownloadsToGraph, transformRecordSetToGraph } from '../utils/dataTransformer';
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
}: UseGraphDataOptions = {}): GraphDataResult => {
  const graphData = useMemo(() => {
    try {
      // Croissant metadata shape: { ..., recordSet: [{ '@id', name, field, ... }] }
      if (downloadsData && Array.isArray(downloadsData.recordSet)) {
        const recordSets = downloadsData.recordSet.filter(
          (recordSet: any) => recordSet['@type'] === 'cr:RecordSet'
        );
        return transformRecordSetToGraph(recordSets);
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

      return { nodes: [], edges: [] };
    } catch (error) {
      console.error('Error transforming graph data:', error);
      return { nodes: [], edges: [] };
    }
  }, [downloadsData]);


  return {
    nodes: graphData.nodes,
    edges: graphData.edges,
    loading: false,
    error: null,
  };
};

export default useGraphData;
