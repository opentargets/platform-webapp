/** Descriptor for a single MCP widget tool — single source of truth for registration. */
export type WidgetDef = {
  /** MCP tool name, e.g. "get_l2g_widget" */
  toolName: string;
  /** Human-readable description shown to the LLM */
  description: string;
  /** The single string input this widget accepts */
  inputParam: { name: string; description: string };
  /**
   * Multi-param variant of inputParam — canonical for section widgets and evidence tools.
   * When present, all entries are registered as MCP tool input schema fields.
   */
  inputParams?: Array<{ name: string; description: string }>;
  /** URI prefix for the MCP resource, e.g. "ui://ot-mcp/l2g" */
  uriPrefix: string;
  /** Filename of the IIFE bundle served from /widgets/, e.g. "l2g.js" */
  bundleFile: string;
  /** <title> text shown in the iframe document */
  title: string;
  /** Message returned to Claude after the widget renders */
  successMessage: string;
  /**
   * When defined, the tool handler fetches this GraphQL query server-side and
   * injects the result via a window.fetch interceptor in the widget HTML.
   * This is required for Claude Desktop where the sandboxed iframe cannot make
   * external network requests.
   */
  prefetch?: {
    /** Full GraphQL query string (must include the operationName) */
    query: string;
    /** Apollo operationName — must match the name in the query string */
    operationName: string;
    /** Extra static variables merged alongside the main inputParam (e.g. pagination) */
    extraVariables?: Record<string, unknown>;
    /**
     * Additional queries to run after the primary query.
     * Variables can depend on the primary query's result (e.g. diseaseIds from studyId).
     */
    extraPrefetches?: Array<{
      query: string;
      operationName: string;
      /** Compute variables from the raw input value and the primary query's data */
      variables: (inputValue: string, primaryData: unknown) => Record<string, unknown>;
      /**
       * When set, the cached data for this operation is an array of items.
       * The interceptor filters by matching item[itemIdField] against the
       * widget's actual request variable[requestVarName], then returns
       * { [responseKey]: filteredItems }.
       * Used for on-demand detail queries (e.g. ClinicalRecordsQuery).
       */
      filteredBy?: {
        requestVarName: string;
        itemIdField: string;
        responseKey: string;
      };
    }>;
    /**
     * Optional: derive additional URLs to fetch server-side from the GraphQL data.
     * Results are injected into the HTML fetch interceptor by exact URL match.
     * Useful for binary/text assets (e.g. AlphaFold CIF files) that would be
     * blocked from the sandboxed iframe.
     */
    extractExtraFetches?: (data: unknown) => Array<{ url: string; contentType: string }>;
  };
  /**
   * Experimental: when true, no server-side prefetch runs. The widget iframe fetches
   * the GraphQL API directly instead, allowlisted via the resource's CSP connectDomains.
   */
  directFetch?: boolean;
};
