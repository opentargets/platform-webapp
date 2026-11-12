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
   * Extra origins to allowlist in CSP connectDomains beyond the GraphQL API, for widgets
   * that fetch other external resources directly from the iframe (e.g. molecular-structure
   * fetching AlphaFold CIF/CSV files and UniProt domain annotations).
   */
  extraConnectDomains?: string[];
};
