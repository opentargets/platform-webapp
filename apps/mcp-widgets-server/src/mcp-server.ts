import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { WIDGET_REGISTRY } from "./widgets/index.js";

const PUBLIC_API_URL = "https://api.platform.opentargets.org/api/v4/graphql";

/**
 * Builds a self-contained HTML string with the widget IIFE bundle inlined.
 *
 * Data delivery follows the standard MCP Apps pattern:
 *   widget's ontoolinput → app.callServerTool("ot_fetch_widget_data") →
 *   result.structuredContent → fetch interceptor cache → Apollo resolves.
 *
 * window.__OT_WIDGET_TOOL__ is set here so createWidgetEntry.tsx knows which
 * tool to call via callServerTool without needing to parse hostContext.
 */
async function makeWidgetShell(
  bundleFile: string,
  title: string,
  toolName: string,
  directFetch?: boolean
): Promise<string> {
  const bundlePath = new URL(`../dist/widgets/${bundleFile}`, import.meta.url).pathname;
  const bundleJs = await readFile(bundlePath, "utf-8");
  const apiUrl = process.env.OT_API_URL ?? PUBLIC_API_URL;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { min-height: 100%; height: auto; }
      #root { min-height: 100%; }
    </style>
    <script>
      window.__OT_API_URL__ = "${apiUrl}";
      window.__OT_WIDGET_TOOL__ = "${toolName}";
      window.__OT_DIRECT_FETCH__ = ${directFetch ? "true" : "false"};
      window.configProfile = { isPartnerPreview: false, partnerTargetSectionIds: [], partnerDiseaseSectionIds: [], partnerDrugSectionIds: [], partnerEvidenceSectionIds: [], partnerDataTypes: [], partnerDataSources: [] };
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script>${bundleJs}</script>
  </body>
</html>`;
}

type PrefetchResult = {
  operations: Array<{ operationName: string; data: unknown }>;
  /** Variable-filtered operations: interceptor filters allItems by request variables at call time */
  filteredOps?: Array<{
    operationName: string;
    allItems: unknown[];
    itemIdField: string;
    requestVarName: string;
    responseKey: string;
  }>;
  urlData?: Array<{ url: string; text: string; contentType: string }>;
};

/** Runs a single GraphQL request against the OT API. */
async function gqlFetch(
  apiUrl: string,
  operationName: string,
  query: string,
  variables: Record<string, unknown>
): Promise<unknown> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operationName, query, variables }),
  });
  const json = (await response.json()) as { data?: unknown };
  return json.data;
}

/** Fetches GraphQL data server-side for widgets that define prefetch config. */
async function fetchPrefetchData(
  def: {
    prefetch: NonNullable<(typeof import("./widgets/index.js").WIDGET_REGISTRY)[number]["prefetch"]>;
    inputParam: { name: string };
    inputParams?: Array<{ name: string }>;
  },
  inputValues: Record<string, string>
): Promise<PrefetchResult | null> {
  const apiUrl = process.env.GRAPHQL_API_URL ?? process.env.OT_API_URL ?? PUBLIC_API_URL;
  try {
    const primaryVariables = {
      ...inputValues,
      ...(def.prefetch.extraVariables ?? {}),
    };
    const primaryData = await gqlFetch(
      apiUrl,
      def.prefetch.operationName,
      def.prefetch.query,
      primaryVariables
    );

    const operations: Array<{ operationName: string; data: unknown }> = [
      { operationName: def.prefetch.operationName, data: primaryData },
    ];

    const filteredOps: PrefetchResult["filteredOps"] = [];

    // Run extra queries in parallel (all depend only on primaryData, not each other)
    if (def.prefetch.extraPrefetches) {
      const firstInputValue = inputValues[def.inputParam.name] ?? Object.values(inputValues)[0] ?? "";
      await Promise.all(
        def.prefetch.extraPrefetches.map(async extra => {
          try {
            const extraData = await gqlFetch(
              apiUrl,
              extra.operationName,
              extra.query,
              extra.variables(firstInputValue, primaryData)
            );
            if (extra.filteredBy) {
              const fb = extra.filteredBy;
              const allItems = (extraData as any)?.[fb.responseKey] ?? [];
              filteredOps.push({
                operationName: extra.operationName,
                allItems,
                itemIdField: fb.itemIdField,
                requestVarName: fb.requestVarName,
                responseKey: fb.responseKey,
              });
            } else {
              operations.push({ operationName: extra.operationName, data: extraData });
            }
          } catch (err) {
            console.error(`[mcp] extra prefetch failed for ${extra.operationName}:`, err);
          }
        })
      );
    }

    // Fetch extra URL assets (e.g. AlphaFold CIF) derived from primary data
    let urlData: Array<{ url: string; text: string; contentType: string }> | undefined;
    if (def.prefetch.extractExtraFetches) {
      const extraFetches = def.prefetch.extractExtraFetches(primaryData);
      if (extraFetches.length > 0) {
        urlData = await Promise.all(
          extraFetches.map(async ({ url, contentType }) => {
            try {
              const r = await fetch(url);
              const text = await r.text();
              return { url, text, contentType };
            } catch (err) {
              console.error(`[mcp] extra fetch failed for ${url}:`, err);
              return { url, text: "", contentType };
            }
          })
        );
      }
    }

    return { operations, filteredOps: filteredOps.length > 0 ? filteredOps : undefined, urlData };
  } catch (err) {
    console.error(`[mcp] prefetch failed for ${def.prefetch.operationName}:`, err);
    return null;
  }
}

export function createMcpServer(): McpServer {
  const server = new McpServer({ name: "ot-widgets-server", version: "0.1.0" });

  for (const def of WIDGET_REGISTRY) {
    const resourceUri = `ui://ot-widgets/${def.toolName}`;

    const params = def.inputParams ?? [def.inputParam];
    const inputSchema = Object.fromEntries(
      params.map(p => [p.name, z.string().describe(p.description)])
    ) as Parameters<typeof registerAppTool>[2]["inputSchema"];

    registerAppTool(
      server,
      def.toolName,
      {
        description: def.description,
        inputSchema,
        _meta: { ui: { resourceUri } },
      },
      async input => {
        console.error(`[mcp] tool called: ${def.toolName}`, input);
        const inputValues = Object.fromEntries(
          params.map(p => [p.name, String(input[p.name as keyof typeof input] ?? "")])
        );

        let prefetched = null;
        if (def.prefetch) {
          prefetched = await fetchPrefetchData(
            def as Parameters<typeof fetchPrefetchData>[0],
            inputValues
          );
        }

        console.error(`[mcp] prefetch done for ${def.toolName}`);

        return {
          content: [{ type: "text" as const, text: def.successMessage }],
          // structuredContent is the spec-defined field for UI data; the host forwards it
          // to the widget via ui/notifications/tool-result without adding it to model context.
          structuredContent: prefetched ?? undefined,
          _meta: { ui: { resourceUri } },
        };
      }
    );

    // Resource handler — serves the HTML shell immediately (no blocking).
    // Data is not embedded here; it arrives via AppBridge tool-result postMessage,
    // except for directFetch widgets, which fetch the GraphQL API directly (see CSP below).
    registerAppResource(server, def.title, resourceUri, { mimeType: RESOURCE_MIME_TYPE }, async () => {
      console.error(`[mcp] resource READ: ${resourceUri}`);
      const html = await makeWidgetShell(def.bundleFile, def.title, def.toolName, def.directFetch);
      const apiUrl = process.env.OT_API_URL ?? PUBLIC_API_URL;
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            ...(def.directFetch
              ? { _meta: { ui: { csp: { connectDomains: [apiUrl] } } } }
              : {}),
          },
        ],
      };
    });
  }

  // Internal tool called by widgets via app.callServerTool() in ontoolinput.
  // This bypasses the notification path (where Claude Desktop strips structuredContent)
  // and returns data through the request/response path instead.
  server.tool(
    "ot_fetch_widget_data",
    {
      tool: z.string().describe("The widget tool name to fetch prefetched data for"),
      inputJson: z.string().describe("JSON-encoded tool input arguments"),
    },
    async ({ tool, inputJson }) => {
      const def = WIDGET_REGISTRY.find(w => w.toolName === tool);
      if (!def?.prefetch) {
        return { content: [{ type: "text" as const, text: "no prefetch config" }] };
      }

      const args = JSON.parse(inputJson) as Record<string, unknown>;
      const params = def.inputParams ?? [def.inputParam];
      const inputValues = Object.fromEntries(
        params.map(p => [p.name, String(args[p.name] ?? "")])
      );

      console.error(`[mcp] ot_fetch_widget_data: tool=${tool}`, inputValues);
      const prefetched = await fetchPrefetchData(
        def as Parameters<typeof fetchPrefetchData>[0],
        inputValues
      );

      return {
        content: [{ type: "text" as const, text: "ok" }],
        structuredContent: prefetched ?? undefined,
      };
    }
  );

  return server;
}
