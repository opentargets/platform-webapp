import { filter } from "graphql-anywhere";
import { useContext } from "react";

import { PlatformApiContext, type PlatformApiContextValue } from "../providers/PlatformApiProvider";

// Overload signatures
function usePlatformApi(): PlatformApiContextValue;
function usePlatformApi<FD = any>(
  fragment: unknown
): Omit<PlatformApiContextValue, "data"> & { data: FD };

// Implementation
function usePlatformApi<FD = any>(
  fragment?: unknown
): PlatformApiContextValue | (Omit<PlatformApiContextValue, "data"> & { data: FD }) {
  const context = useContext(PlatformApiContext);

  if (context === undefined) {
    throw new Error("usePlatformApi must be used within a PlatformApiProvider");
  }

  // Filter relevant section of the platform-api graphql query.
  if (context.data && fragment) {
    return { ...context, data: filter<FD>(fragment as any, context.data[context.entity]) };
  }

  return context;
}

export default usePlatformApi;
