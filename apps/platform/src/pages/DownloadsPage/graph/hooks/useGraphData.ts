/**
 * Hook: useGraphData
 * Transforms schema data into graph nodes and edges with proper classification
 */

import { useContext, useMemo } from 'react';
import { DownloadsContext } from '../../context/DownloadsContext';
import { transformRecordSetToGraph } from '../utils/dataTransformer';

interface GraphDataResult {
  nodes: any[];
  edges: any[];
  loading: boolean;
  error: Error | null;
}

/**
 * Transform schema data into Cytoscape-compatible graph structure
 * Builds relationships based purely on the Croissant schema metadata
 */
export const useGraphData = (): GraphDataResult => {
  const { state } = useContext(DownloadsContext);

  const graphData = useMemo(() => {
    try {
      if (!state.schemaRows || !Array.isArray(state.schemaRows)) {
        return { nodes: [], edges: [] };
      }

      // Filter to Croissant RecordSet items and transform to graph
      const recordSets = state.schemaRows.filter(
        (recordSet: any) => recordSet['@type'] === 'cr:RecordSet'
      );
      return transformRecordSetToGraph(recordSets);
    } catch (error) {
      console.error('Error transforming graph data:', error);
      return { nodes: [], edges: [] };
    }
  }, [state.schemaRows]);

  return {
    nodes: graphData.nodes,
    edges: graphData.edges,
    loading: state.loading,
    error: null,
  };
};

export default useGraphData;
