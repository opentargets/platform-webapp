/**
 * Open Targets report provider: report-builder's ReportProvider with the platform's
 * config (API endpoint and client, data release, deep links, provenance labels)
 * and its table component. Mount it inside OTConfigurationProvider.
 */
import { type ReactNode, useMemo, useState } from "react";
import {
  localStorageAdapter,
  type ReportSection,
  type ReportStorage,
  type ReportStore,
  type ReactWidgetRegistry,
  type ReportComponents,
  type ReportConfig,
  ReportProvider,
  useReportSaveStatus,
} from "report-builder";
import { Snackbar } from "@mui/material";
import { type ApolloClient, gql, useApolloClient } from "@apollo/client";
import ReportRowsTable from "../components/OtTable/ReportRowsTable";
import { useConfigContext } from "./ConfigurationProvider";

// Kept for existing importers; the implementations live in report-builder
export { STORAGE_BUDGET_BYTES, fitsStorageBudget, formatBytes, serializeBlock } from "report-builder";
export type { ReportStorage, SaveResult, SaveStatus } from "report-builder";
export {
  useReportBuilder,
  useReportBuilderDispatch,
  useReportBuilderState,
  useReportSaveStatus,
  useReportStore,
} from "report-builder";

/** Default persistence: `localStorage["ot-reports"]` with the core's size budget. */
export const localReportStorage: ReportStorage = localStorageAdapter();

export const PLATFORM_GRAPHQL_ENDPOINT = "https://api.platform.opentargets.org/api/v4/graphql";

// Registry entity name → platform route segment (see apps/platform App.tsx routes)
const ENTITY_ROUTES: Record<string, string> = {
  target: "target",
  disease: "disease",
  drug: "drug",
  variant: "variant",
  study: "study",
  credibleSet: "credible-set",
  evidence: "evidence",
};

const stringVar = (variables: Record<string, unknown> | undefined, ...keys: string[]) => {
  for (const key of keys) {
    const value = variables?.[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
};

const platformOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "https://platform.opentargets.org";

/** Platform URL for an entity page (the report's entity context), e.g. …/target/ENSG00000157764. */
export const entityDeepLink = (entity: { type: string; id?: string } | undefined): string => {
  const route = entity ? ENTITY_ROUTES[entity.type] : undefined;
  return route && entity?.id ? `${platformOrigin()}/${route}/${encodeURIComponent(entity.id)}` : platformOrigin();
};

/** Entity page id for a widget; evidence pages are keyed by target + disease. */
const widgetEntityPath = (section: ReportSection): string | undefined => {
  const entity = section.definition.entity;
  const route = ENTITY_ROUTES[entity];
  if (!route) return undefined;
  if (entity === "evidence") {
    const ensemblId = stringVar(section.request?.variables, "ensemblId", "ensgId");
    const efoId = stringVar(section.request?.variables, "efoId");
    return ensemblId && efoId ? `/${route}/${ensemblId}/${efoId}` : undefined;
  }
  return section.entityId ? `/${route}/${encodeURIComponent(section.entityId)}` : undefined;
};

/** Platform URL for the widget's entity page, anchored at the section (SectionItem uses definition.id). */
export const widgetDeepLink = (section: ReportSection): string | undefined => {
  const path = widgetEntityPath(section);
  return path ? `${platformOrigin()}${path}#${section.definition.id}` : undefined;
};

/** "Open Targets Platform API" for OT endpoints, else the endpoint's host. */
export const endpointLabel = (endpoint: string): string => {
  try {
    const host = new URL(endpoint).host;
    return /opentargets\.(org|io|xyz)$/.test(host) ? "Open Targets Platform API" : host;
  } catch {
    return endpoint;
  }
};

const isTrustedHost = (host: string) => host === "opentargets.org" || host.endsWith(".opentargets.org");

// Apollo adds __typename to every selection; drop it unless the query asked for it
const stripTypename = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripTypename);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "__typename")
        .map(([key, v]) => [key, stripTypename(v)])
    );
  }
  return value;
};

const DATA_RELEASE_QUERY = gql`
  query ExportDataRelease {
    meta {
      dataVersion {
        year
        month
        iteration
      }
    }
  }
`;

let releasePromise: Promise<string | undefined> | null = null;

/** Platform data release (e.g. "26.06") from the API meta query; cached for the session. */
export async function fetchDataRelease(client: ApolloClient<unknown>): Promise<string | undefined> {
  if (!releasePromise) {
    releasePromise = client
      .query<{ meta?: { dataVersion?: { year?: string; month?: string; iteration?: string | null } } }>({
        query: DATA_RELEASE_QUERY,
        fetchPolicy: "cache-first",
      })
      .then(({ data }) => {
        const version = data?.meta?.dataVersion;
        if (!version?.year || !version?.month) return undefined;
        const base = `${version.year}.${String(version.month).padStart(2, "0")}`;
        return version.iteration && version.iteration !== "0" ? `${base}.${version.iteration}` : base;
      })
      .catch(() => {
        // Let a later dialog open retry
        releasePromise = null;
        return undefined;
      });
  }
  return releasePromise;
}

/** The platform's ReportConfig over its Apollo client and API endpoint. */
export const usePlatformReportConfig = (): Partial<ReportConfig> => {
  const client = useApolloClient();
  const { config } = useConfigContext();
  const appEndpoint = config?.urlApi;
  return useMemo<Partial<ReportConfig>>(
    () => ({
      graphql: {
        defaultEndpoint: PLATFORM_GRAPHQL_ENDPOINT,
        appEndpoint,
        execute: async ({ query, variables }) => {
          const res = await client.query({
            query: gql(query),
            variables,
            fetchPolicy: "network-only",
            errorPolicy: "all",
          });
          const data = query.includes("__typename") ? res.data : stripTypename(res.data);
          return { data: { data }, errors: res.errors ?? res.error?.graphQLErrors, httpStatus: 200 };
        },
      },
      notebookRuntimeUrl: "/notebook-runtime/index.html",
      isTrustedHost,
      fetchDataRelease: () => fetchDataRelease(client),
      // Queries that existed before the widget mounted (live page, dialog) don't gate readiness
      createBusyProbe: () => {
        let baseline = new Set<string>();
        try {
          baseline = new Set(Array.from(client.getObservableQueries("all").keys()));
        } catch {
          // older/foreign clients: the RenderHost falls back to DOM signals
        }
        return () => {
          try {
            for (const [queryId, query] of client.getObservableQueries("active")) {
              if (!baseline.has(queryId) && query.getCurrentResult(false).loading) return true;
            }
          } catch {
            // as above
          }
          return false;
        };
      },
      sourceLabel: (section) => `Open Targets Platform · ${section.definition.name}`,
      widgetDeepLink,
      entityDeepLink,
      endpointLabel,
      isFirstPartyEndpoint: (endpoint) => endpointLabel(endpoint) === "Open Targets Platform API",
    }),
    [client, appEndpoint]
  );
};

const platformComponents: ReportComponents = { RowsTable: ReportRowsTable };

interface ReportBuilderProviderProps {
  children: ReactNode;
  /** Persistence adapter; defaults to localStorage. Ignored when `store` is given. */
  storage?: ReportStorage;
  /** A pre-built store (tests, or a host that owns the store's lifecycle). */
  store?: ReportStore;
  /** Widget registry; defaults to the one registerAllSections populates. */
  registry?: ReactWidgetRegistry;
}

export const ReportBuilderProvider = ({ children, storage = localReportStorage, store, registry }: ReportBuilderProviderProps) => {
  const config = usePlatformReportConfig();
  return (
    <ReportProvider storage={storage} store={store} registry={registry} config={config} components={platformComponents}>
      {children}
      <SaveStatusSnackbar />
    </ReportProvider>
  );
};

/** Toast for a failed save (report over the storage budget). */
const SaveStatusSnackbar = () => {
  const status = useReportSaveStatus();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const message = status.ok ? null : (status.error ?? "Failed to save this report.");
  const open = !!message && dismissed !== message;
  return (
    <Snackbar
      open={open}
      message={message}
      onClose={(_, reason) => reason !== "clickaway" && setDismissed(message)}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    />
  );
};

