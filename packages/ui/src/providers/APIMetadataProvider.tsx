import { type ApolloError, gql, useQuery } from "@apollo/client";
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from "react";

// QUERY
const DATA_VERSION_QUERY = gql`
  query DataVersion {
    meta {
      dataVersion {
        month
        year
        iteration
      }
      apiVersion {
        x
        y
        z
      }
    }
  }
`;

type APIVersion = {
  x: string;
  y: string;
  z: string;
};

type Version = {
  month: string;
  year: string;
  iteration: string;
  loading: boolean;
  error: ApolloError | null;
  apiVersion: APIVersion;
};

type ContextType = {
  version: Version;
};

const initialAPIVersion: APIVersion = {
  x: "0",
  y: "0",
  z: "0",
};

const initialState: ContextType = {
  version: {
    loading: false,
    error: null,
    month: "0",
    year: "0",
    iteration: "0",
    apiVersion: initialAPIVersion,
  },
};
export const APIMetadataContext = createContext<ContextType | undefined>(undefined);

export const APIMetadataProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [version, setVersion] = useState<ContextType["version"]>(initialState.version);

  const { data, loading, error } = useQuery(DATA_VERSION_QUERY);

  useEffect(() => {
    if (loading) {
      setVersion((v) => ({ ...v, loading }));
      return;
    }

    if (error) {
      setVersion((v) => ({ ...v, error }));
      return;
    }
    const {
      meta: {
        dataVersion: { month, year, iteration },
        apiVersion,
      },
    } = data;

    setVersion({
      loading: false,
      error: null,
      month: month,
      year: year,
      iteration: iteration,
      apiVersion: apiVersion,
    });
  }, [data, loading, error]);

  return <APIMetadataContext.Provider value={{ version }}>{children}</APIMetadataContext.Provider>;
};

export const useAPIMetadata = (): ContextType => {
  const context = useContext(APIMetadataContext);

  if (!context) {
    throw new Error("useAPIMetadata must be used inside the APIMetadataProvider");
  }

  return context;
};
