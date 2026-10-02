import type { ReportSection } from "../core";
import { type BrandingInput, type ExportBranding, resolveBranding } from "../core";

/** Result of running a GraphQL query for a data block. */
export interface GraphqlExecution {
  /** The response body, i.e. `{ data, errors? }`. */
  data: unknown;
  errors?: readonly { message: string; path?: readonly (string | number)[] }[];
  httpStatus: number;
  httpError?: string;
}

/**
 * Everything the report UI needs from its host: endpoints, the notebook sandbox
 * URL, provenance labels and deep links, and optional hooks that let the host
 * route requests through its own client. Every field has a generic default.
 */
export interface ReportConfig {
  graphql: {
    /** Endpoint a new GraphQL block starts with. */
    defaultEndpoint: string;
    /** The host's own API, if any; blocks pointed at it may run through `execute`. */
    appEndpoint?: string;
    /** Run a query against `appEndpoint` through the host's client (cache, auth). Others use fetch. */
    execute?: (args: { endpoint: string; query: string; variables: Record<string, unknown> }) => Promise<GraphqlExecution>;
    /** Whether to fetch an endpoint's schema for autocomplete and lint. Default: the two endpoints above. */
    introspect?: (endpoint: string) => boolean;
  };
  /** URL of the sandboxed notebook runtime page (see packages/notebook-runtime). */
  notebookRuntimeUrl: string;
  /** REST blocks ask before sending a request to a host that isn't trusted. */
  isTrustedHost: (host: string) => boolean;
  /** Data release label for provenance (e.g. "26.06"); undefined when the host has none. */
  fetchDataRelease?: () => Promise<string | undefined>;
  /**
   * For export capture: returns a probe that reports whether the host is still
   * fetching for the widget rendered since the probe was created.
   */
  createBusyProbe?: () => () => boolean;
  /** Provenance: where a widget's data came from, e.g. "Open Targets Platform · Safety". */
  sourceLabel: (section: ReportSection) => string;
  /** Provenance: link to the page a widget was captured from. */
  widgetDeepLink?: (section: ReportSection) => string | undefined;
  /** Provenance: link to a report's entity page. */
  entityDeepLink?: (entity: { type: string; id?: string } | undefined) => string | undefined;
  /** Provenance: label for a data block's endpoint; default is its host name. */
  endpointLabel: (endpoint: string) => string;
  /** Data blocks pointed at the host's own API are dated with the data release. */
  isFirstPartyEndpoint: (endpoint: string) => boolean;
  /**
   * Export branding: organisation and platform names, logo, slide and document palettes, fonts
   * and wording. Resolved from the host's `BrandingInput` (see `resolveBranding`); the default is
   * neutral (no logo, no organisation).
   */
  branding: ExportBranding;
}

/** What a host passes to `ReportProvider`: every field optional, branding as a partial. */
export type ReportConfigInput = Partial<Omit<ReportConfig, "branding">> & { branding?: BrandingInput };

const hostOf = (endpoint: string): string => {
  try {
    return new URL(endpoint).host;
  } catch {
    return endpoint;
  }
};

export const defaultReportConfig = (): ReportConfig => ({
  graphql: { defaultEndpoint: "" },
  notebookRuntimeUrl: "/notebook-runtime/index.html",
  isTrustedHost: () => false,
  sourceLabel: (section) => section.definition.name,
  endpointLabel: hostOf,
  isFirstPartyEndpoint: () => false,
  branding: resolveBranding(),
});

export const withConfigDefaults = (config?: ReportConfigInput): ReportConfig => {
  const base = defaultReportConfig();
  return {
    ...base,
    ...config,
    graphql: { ...base.graphql, ...config?.graphql },
    branding: config?.branding ? resolveBranding(config.branding) : base.branding,
  };
};

/** Same host and path, ignoring scheme case and a trailing slash. */
export const normalizeEndpoint = (url: string): string => {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return url.trim().replace(/\/+$/, "").toLowerCase();
  }
};

export const shouldIntrospect = (config: ReportConfig, endpoint: string): boolean => {
  if (config.graphql.introspect) return config.graphql.introspect(endpoint);
  const e = normalizeEndpoint(endpoint);
  return (
    (!!config.graphql.defaultEndpoint && e === normalizeEndpoint(config.graphql.defaultEndpoint)) ||
    (!!config.graphql.appEndpoint && e === normalizeEndpoint(config.graphql.appEndpoint))
  );
};
