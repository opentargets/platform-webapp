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

// Same profile mechanism the real platform app uses: apps/platform/index.html loads
// <script src="/profiles/{name}.js"> before its app bundle, setting window.configProfile.
// OT_PROFILE picks which file — "platform" (public) or "ppp" (partner preview).
const PROFILES_ROOT = new URL("../../../apps/platform/public/profiles", import.meta.url).pathname;

/**
 * Builds a self-contained HTML string with the widget IIFE bundle inlined.
 * The widget's own Apollo client fetches the GraphQL API directly from the
 * iframe — no server-side prefetch. Allowed origins are declared via CSP
 * connectDomains on the resource (see registerAppResource below).
 */
async function makeWidgetShell(bundleFile: string, title: string): Promise<string> {
  const bundlePath = new URL(`../dist/widgets/${bundleFile}`, import.meta.url).pathname;
  const bundleJs = await readFile(bundlePath, "utf-8");
  const apiUrl = process.env.OT_API_URL ?? PUBLIC_API_URL;
  const profileName = process.env.OT_PROFILE ?? "platform";
  const profileJs = await readFile(`${PROFILES_ROOT}/${profileName}.js`, "utf-8");

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
    </script>
    <script>${profileJs}</script>
  </head>
  <body>
    <div id="root"></div>
    <script>${bundleJs}</script>
  </body>
</html>`;
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
        return {
          content: [{ type: "text" as const, text: def.successMessage }],
          _meta: { ui: { resourceUri } },
        };
      }
    );

    // Resource handler — serves the HTML shell. The widget's Apollo client fetches
    // data directly from the iframe once mounted; CSP connectDomains allowlists the
    // GraphQL API plus any extra origins the widget needs (e.g. AlphaFold, UniProt).
    registerAppResource(server, def.title, resourceUri, { mimeType: RESOURCE_MIME_TYPE }, async () => {
      console.error(`[mcp] resource READ: ${resourceUri}`);
      const html = await makeWidgetShell(def.bundleFile, def.title);
      const apiUrl = process.env.OT_API_URL ?? PUBLIC_API_URL;
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: { connectDomains: [apiUrl, ...(def.extraConnectDomains ?? [])] },
              },
            },
          },
        ],
      };
    });
  }

  return server;
}
