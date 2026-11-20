import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export const MCP_URL = process.env.MCP_URL ?? "http://localhost:3001/mcp";

export interface WidgetResource {
  html: string;
  connectDomains: string[];
  resourceDomains: string[];
}

/** Talks to the widget server the way a chat host does: tools/call, then resources/read. */
export async function connectMcp() {
  const client = new Client({ name: "ot-render-test", version: "0.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL)));

  return {
    async callTool(name: string, args: Record<string, unknown>) {
      return client.callTool({ name, arguments: args });
    },

    async readWidget(uri: string): Promise<WidgetResource> {
      const { contents } = await client.readResource({ uri });
      const [content] = contents;
      if (!content || !("text" in content)) throw new Error(`No HTML in resource ${uri}`);
      const csp = (content._meta as { ui?: { csp?: Record<string, string[]> } } | undefined)?.ui
        ?.csp;
      return {
        html: content.text,
        connectDomains: csp?.connectDomains ?? [],
        resourceDomains: csp?.resourceDomains ?? [],
      };
    },

    close: () => client.close(),
  };
}

/**
 * The CSP an MCP Apps host applies to the widget iframe: nothing external except
 * the origins the resource declares. No 'unsafe-eval', so Pixi must use its polyfill.
 */
export function buildCsp({ connectDomains, resourceDomains }: WidgetResource): string {
  const resources = resourceDomains.join(" ");
  return [
    "default-src 'none'",
    `script-src 'unsafe-inline' blob: ${resources}`,
    `style-src 'unsafe-inline' ${resources}`,
    `img-src data: blob: ${resources}`,
    `font-src data: ${resources}`,
    "worker-src blob:",
    `connect-src ${connectDomains.join(" ")}`,
  ].join("; ");
}
