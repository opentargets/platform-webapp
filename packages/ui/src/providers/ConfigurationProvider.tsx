import type { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { type Config, theme } from "@ot/config";
import { createContext, type PropsWithChildren, useContext } from "react";
import { APIMetadataProvider } from "./APIMetadataProvider";
import { OTApolloProvider } from "./OTApolloProvider/OTApolloProvider";
import ThemeProvider from "./ThemeProvider/ThemeProvider";

type ContextType = {
  config: Config | null;
};
interface ProviderProps extends PropsWithChildren {
  config: Config | null;
  client?: ApolloClient<NormalizedCacheObject>;
}

export const OTConfigurationContext = createContext<ContextType>({ config: null });

export const OTConfigurationProvider = ({
  children,
  config,
  client,
}: ProviderProps): JSX.Element => {
  if (!config) {
    throw new Error("ConfigurationProvider requires a Config object");
  }
  return (
    <OTConfigurationContext.Provider value={{ config }}>
      <OTApolloProvider config={config} client={client}>
        <ThemeProvider theme={theme}>
          <APIMetadataProvider>{children}</APIMetadataProvider>
        </ThemeProvider>
      </OTApolloProvider>
    </OTConfigurationContext.Provider>
  );
};

export const useConfigContext = (): ContextType => {
  const context = useContext(OTConfigurationContext);

  if (!context) {
    throw new Error("useConfigContext must be used inside the ConfigurationProvider");
  }

  return context;
};
