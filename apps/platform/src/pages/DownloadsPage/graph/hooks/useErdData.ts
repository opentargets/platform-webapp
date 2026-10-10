/**
 * Hook: useErdData
 * Transforms schema data into the ERD canvas's table-card nodes and
 * per-field connectors. Mirrors `useGraphData`, just calling
 * `transformRecordSetToERD` instead of `transformRecordSetToGraph`.
 */

import { useContext, useMemo } from 'react';
import { DownloadsContext } from '../../context/DownloadsContext';
import { transformRecordSetToERD, ErdNode, ErdEdge } from '../utils/dataTransformer';

interface ErdDataResult {
  nodes: ErdNode[];
  edges: ErdEdge[];
}

export const useErdData = (): ErdDataResult => {
  const { state } = useContext(DownloadsContext);

  return useMemo(() => {
    try {
      if (!state.schemaRows || !Array.isArray(state.schemaRows)) {
        return { nodes: [], edges: [] };
      }
      const recordSets = state.schemaRows.filter(
        (recordSet: any) => recordSet['@type'] === 'cr:RecordSet'
      ) as any[];
      return transformRecordSetToERD(recordSets);
    } catch (error) {
      console.error('Error transforming ERD data:', error);
      return { nodes: [], edges: [] };
    }
  }, [state.schemaRows]);
};

export default useErdData;
