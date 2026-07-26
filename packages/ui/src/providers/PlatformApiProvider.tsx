import {
  type DocumentNode,
  type OperationVariables,
  type QueryResult,
  useQuery,
} from "@apollo/client";
import { createContext, type ReactNode, useMemo } from "react";

interface PlatformApiContextValue {
  entity: string;
  loading: boolean;
  error?: any;
  data?: any;
  refetch: () => Promise<any>;
  fetchMore: (options: any) => Promise<any>;
}

const PlatformApiContext = createContext<PlatformApiContextValue | undefined>(undefined);

interface PlatformApiProviderProps<T, K extends OperationVariables> {
  entity: string;
  query: DocumentNode;
  variables?: K;
  children: ReactNode;
}

function PlatformApiProvider<T, K extends OperationVariables>({
  entity,
  query,
  variables,
  children,
}: PlatformApiProviderProps<T, K>) {
  const request: QueryResult<T, K> = useQuery<T, K>(query, { variables });

  const { loading, error, data, refetch, fetchMore } = request;

  const platformApiValue = useMemo(
    () => ({
      loading,
      error,
      data,
      refetch,
      fetchMore,
      entity,
    }),
    [loading, error, data, refetch, fetchMore, entity]
  );

  return (
    <PlatformApiContext.Provider value={platformApiValue}>{children}</PlatformApiContext.Provider>
  );
}

export default PlatformApiProvider;
export { PlatformApiContext };
export type { PlatformApiContextValue };
