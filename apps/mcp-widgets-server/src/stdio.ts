/**
 * Stdio transport entry point — exposes all widget tools over stdin/stdout.
 * Used to connect Claude Desktop directly (claude_desktop_config.json).
 *
 * Widget bundles are read from dist/widgets/ and inlined into the HTML resource.
 * Run "yarn build:widgets" once before starting this entry point.
 *
 * GraphQL data is fetched server-side when the tool is called and injected into
 * the widget HTML via a fetch interceptor — the iframe makes no external requests.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "./mcp-server.js";

const transport = new StdioServerTransport();
await createMcpServer().connect(transport);
