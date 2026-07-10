import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./mcp-server.js";
import { WIDGET_REGISTRY } from "./widgets/index.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

const app = express();
app.use(express.json());
app.use(cors({ origin: "*", exposedHeaders: ["mcp-session-id"] }));

// ----- MCP transport (stateful sessions over HTTP) -----

const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport = sessionId ? transports.get(sessionId) : undefined;

  if (!transport) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: sid => {
        transports.set(sid, transport!);
      },
    });
    transport.onclose = () => {
      if (transport?.sessionId) transports.delete(transport.sessionId);
    };
    await createMcpServer().connect(transport);
  }

  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) { res.status(404).json({ error: "Session not found" }); return; }
  await transport.handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) { res.status(404).json({ error: "Session not found" }); return; }
  await transport.handleRequest(req, res);
});

// ----- Static assets -----

// Serve the sandbox proxy (only in local dev — the platform app must be present).
const sandboxProxyRoot = new URL("../../../apps/platform/public", import.meta.url).pathname;
app.get("/sandbox_proxy.html", (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.sendFile("sandbox_proxy.html", { root: sandboxProxyRoot }, err => {
    if (err) res.status(404).send("Not available in this deployment");
  });
});

// Serve the built widget IIFE bundles.
app.use(
  "/widgets",
  express.static(new URL("../dist/widgets", import.meta.url).pathname, {
    setHeaders: res => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    },
  })
);

// ----- Utility endpoints -----

app.get("/health", (_req, res) =>
  res.json({ status: "ok", server: "ot-widgets-server", sessions: transports.size })
);

app.get("/status", (_req, res) =>
  res.json({
    server: "ot-widgets-server",
    widgets: WIDGET_REGISTRY.length,
  })
);

// ----- Start -----

app.listen(PORT, () => {
  console.log("\n Open Targets Widgets MCP Server");
  console.log(`   Running on    http://localhost:${PORT}`);
  console.log(`   MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`   Widgets:      http://localhost:${PORT}/widgets/`);
  console.log(`   Status:       http://localhost:${PORT}/status\n`);
});
