import type { DocumentNode } from "@apollo/client";
import { tableChunkSize } from "@ot/constants";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApolloClient } from "../providers/OTApolloProvider/OTApolloProvider";

type BatchQueryState<T = unknown> = {
  loading: boolean;
  error: Error | null;
  data: T | null;
};

type UseBatchQueryProps = {
  query: DocumentNode;
  variables: Record<string, unknown>;
  dataPath: string;
  size?: number;
  rowField?: string;
  countField?: string;
  id?: string;
  enabled?: boolean;
};

/**
 * Provides functionality to asynchronously batch-download a complete dataset
 * from the backend, handling pagination automatically.
 *
 * @param {DocumentNode} query - GraphQL query to run
 * @param {Record<string, unknown>} variables - Variables for the query
 * @param {string} dataPath - Path where data is located in the response
 * @param {number} [size=tableChunkSize] - Size of each chunk to fetch
 * @param {string} [rowField=rows] - Field containing the rows in dataPath
 * @param {string} [countField=count] - Field containing the row count in dataPath
 * @param {string} [id] - Unique identifier to trigger refetches
 * @param {boolean} [enabled=true] - Whether to enable the query
 *
 * @returns {BatchQueryState<T>} Current state of the batch query
 */
function useBatchQuery<T = any>({
  query,
  variables,
  dataPath,
  size = tableChunkSize,
  rowField = "rows",
  countField = "count",
  id,
  enabled = true,
}: UseBatchQueryProps): BatchQueryState<T> {
  const client = useApolloClient();
  const rowPath = `${dataPath}.${rowField}`;
  const countPath = `${dataPath}.${countField}`;

  const [state, setState] = useState<BatchQueryState<T>>({
    loading: true,
    error: null,
    data: null,
  });

  // Memoize variables to prevent unnecessary re-renders
  const memoizedVariables = useMemo(() => ({ ...variables }), [JSON.stringify(variables)]);

  // Function to get a single data chunk
  const getDataChunk = useCallback(
    (index: number) => {
      return client.query({
        query,
        variables: { ...memoizedVariables, index, size },
      });
    },
    [client, query, memoizedVariables, size]
  );

  // Function to retrieve the entire dataset
  const fetchWholeDataset = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Fetch first chunk to get total count
      const firstChunk = await getDataChunk(0);

      if (!firstChunk.data) {
        throw new Error("No data returned from first chunk");
      }

      // Get data from first chunk
      let allRows = [...getRows<T>(firstChunk.data, rowPath)];

      // Calculate how many chunks we need based on count
      const totalCount = _.get(firstChunk.data, countPath, 0);
      const totalChunks = Math.ceil(totalCount / size);

      if (totalChunks > 1) {
        // Prepare promises for remaining chunks
        const chunkPromises = Array.from({ length: totalChunks - 1 }, (_, i) =>
          getDataChunk(i + 1)
        );

        // Fetch all remaining chunks in parallel
        const remainingChunks = await Promise.all(chunkPromises);

        // Combine all data
        remainingChunks.forEach((chunk) => {
          if (chunk.data) {
            allRows = [...allRows, ...getRows<T>(chunk.data, rowPath)];
          }
        });
      }

      // Create a deep clone of the first chunk's complete response
      const completeResponse = _.cloneDeep(firstChunk.data);

      // Update the row data at the specified path
      _.set(completeResponse, rowPath, allRows);

      // Update state with the complete response
      setState({
        loading: false,
        error: null,
        data: completeResponse,
      });

      return completeResponse;
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        data: null,
      });
      throw error;
    }
  }, [getDataChunk, rowPath, countPath, size]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (!enabled || variables === null) {
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    fetchWholeDataset().catch((error) => {
      console.error("Error fetching batch data:", error);
    });
  }, [fetchWholeDataset, id, enabled, variables.variantId]);

  return state;
}

// Helper function to get rows from data
function getRows<T>(data: any, dataPath: string): T[] {
  return _.get(data, dataPath, []);
}

export default useBatchQuery;
