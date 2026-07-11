/**
 * Factory that wires up the App class, fetch interceptor, ResizeObserver
 * height reporting, Emotion cache, and MUI theme for a widget IIFE bundle.
 *
 * Data delivery pattern (per MCP Apps spec examples):
 *   ontoolinput fires → app.callServerTool("ot_fetch_widget_data") →
 *   read result.structuredContent → populate fetch interceptor cache →
 *   Apollo queries resolve from cache.
 *
 * app.ontoolresult is kept as a primary path for when Claude Desktop fixes
 * the structuredContent stripping bug (#696 in ext-apps).
 *
 * autoResize: false — we report only HEIGHT manually so AppFrame never sets a
 * pixel width on the proxy iframe (which would collapse the layout to the
 * document's current pixel width and trigger a feedback loop).
 */
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@modelcontextprotocol/ext-apps";
import { ThemeProvider, CssBaseline } from "@mui/material";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import { MemoryRouter } from "react-router-dom";
import { theme } from "./theme";

// __OT_API_URL__ is injected at build time by Vite's define (from OT_API_URL in .env).
// window.__OT_API_URL__ can override it at runtime (set by the HTML shell script).
declare const __OT_API_URL__: string;

const apolloClient = new ApolloClient({
  uri: (window as { __OT_API_URL__?: string }).__OT_API_URL__ ?? __OT_API_URL__,
  cache: new InMemoryCache(),
});

// ── Prefetch data types ───────────────────────────────────────────────────────

interface FilteredOp {
  operationName: string;
  allItems: unknown[];
  itemIdField: string;
  requestVarName: string;
  responseKey: string;
}

interface PrefetchResult {
  operations?: Array<{ operationName: string; data: unknown }>;
  filteredOps?: FilteredOp[];
  urlData?: Array<{ url: string; text: string; contentType: string }>;
}

// ── Module-scope data store ───────────────────────────────────────────────────
// Shared between the fetch interceptor and applyData. Module scope guarantees
// the interceptor is in place before Apollo Client makes its first request.

const _gql: Record<string, unknown> = {};
const _gqlPending: Record<string, Array<(data: unknown) => void>> = {};
const _filteredOps: Record<string, FilteredOp> = {};
let _urls: Array<{ url: string; text: string; contentType: string }> = [];

function clearDataStore() {
  for (const k of Object.keys(_gql)) delete _gql[k];
  for (const k of Object.keys(_gqlPending)) delete _gqlPending[k];
  for (const k of Object.keys(_filteredOps)) delete _filteredOps[k];
  _urls = [];
}

function applyData(pf: PrefetchResult) {
  _urls = pf.urlData ?? [];

  for (const fo of pf.filteredOps ?? []) {
    _filteredOps[fo.operationName] = fo;
  }

  for (const op of pf.operations ?? []) {
    if (op.operationName === undefined) continue;
    _gql[op.operationName] = op.data;
    const waiting = _gqlPending[op.operationName];
    if (waiting) {
      for (const resolve of waiting) resolve(op.data);
      delete _gqlPending[op.operationName];
    }
  }
}

// ── window.fetch interceptor ──────────────────────────────────────────────────
// Must be set up at module scope (before any Apollo query runs) so every
// GraphQL request is routed through the prefetch cache.

const _originalFetch = window.fetch.bind(window);

// Set by the HTML shell before this bundle runs. When true, this widget skips
// server-side prefetch entirely and fetches the GraphQL API directly — the
// interceptor must get out of the way and let requests through unmolested.
const _isDirectFetch = Boolean((window as { __OT_DIRECT_FETCH__?: boolean }).__OT_DIRECT_FETCH__);

window.fetch = function otFetchInterceptor(
  url: RequestInfo | URL,
  opts?: RequestInit
): Promise<Response> {
  if (_isDirectFetch) return _originalFetch(url as RequestInfo, opts);
  try {
    // Cached URL assets (e.g. AlphaFold CIF files fetched by the 3D widget)
    const urlStr =
      typeof url === "string" ? url : url instanceof URL ? url.href : (url as Request).url;
    const urlEntry = _urls.find(e => e.url === urlStr);
    if (urlEntry) {
      return Promise.resolve(
        new Response(urlEntry.text, {
          status: 200,
          headers: { "Content-Type": urlEntry.contentType },
        })
      );
    }

    // GraphQL POST requests
    if (opts?.method === "POST" && typeof opts.body === "string") {
      const body = JSON.parse(opts.body) as { operationName?: string; variables?: Record<string, unknown> };
      const op = body.operationName;
      if (op) {
        // Filtered operation — server prefetches all items; interceptor filters by request vars
        const fo = _filteredOps[op];
        if (fo) {
          const reqIds = ((body.variables ?? {})[fo.requestVarName] ?? []) as unknown[];
          const idSet = new Set(reqIds);
          const filtered = (fo.allItems as Record<string, unknown>[]).filter(
            item => idSet.has(item[fo.itemIdField])
          );
          const data: Record<string, unknown> = {};
          data[fo.responseKey] = filtered;
          return Promise.resolve(
            new Response(JSON.stringify({ data }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        // Already cached
        if (_gql[op] !== undefined) {
          return Promise.resolve(
            new Response(JSON.stringify({ data: _gql[op] }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }

        // Pend until applyData populates this operation
        return new Promise((resolve, reject) => {
          if (!_gqlPending[op]) _gqlPending[op] = [];
          _gqlPending[op].push(data =>
            resolve(
              new Response(JSON.stringify({ data }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              })
            )
          );
          setTimeout(() => reject(new Error(`OT data timeout for ${op}`)), 30000);
        });
      }
    }
  } catch (_) {}

  return _originalFetch(url as RequestInfo, opts);
};

// ── Widget entry factory ──────────────────────────────────────────────────────

export interface WidgetEntryConfig<TArgs extends Record<string, unknown>> {
  /** MCP app name reported to the host, e.g. "ot-l2g-widget" */
  appName: string;
  /** Emotion cache key — must be unique per widget to avoid style conflicts */
  cacheKey: string;
  /** Extract typed args from the raw ontoolinput arguments object, or null if incomplete */
  extractArgs: (args: Record<string, unknown>) => TArgs | null;
  /** The widget React component to render once args are received */
  component: React.ComponentType<TArgs>;
}

export function mountWidget<TArgs extends Record<string, unknown>>(
  config: WidgetEntryConfig<TArgs>
): void {
  const emotionCache = createCache({
    key: config.cacheKey,
    container: document.head,
    speedy: false,
  });

  const app = new App({ name: config.appName, version: "0.1.0" }, {}, { autoResize: false });

  function Root() {
    const [args, setArgs] = useState<TArgs | null>(null);

    React.useEffect(() => {
      let observer: ResizeObserver | null = null;

      async function connect() {
        try {
          // ontoolresult: primary path for when Claude Desktop fixes #696
          app.ontoolresult = result => {
            if (result.structuredContent) {
              applyData(result.structuredContent as PrefetchResult);
            }
          };

          // ontoolinput: set BEFORE connect() so we never miss the initial event.
          // Calls callServerTool to fetch prefetched data (request/response path,
          // not a notification — avoids the structuredContent stripping bug #696).
          app.ontoolinput = async ({ arguments: rawArgs }) => {
            clearDataStore();

            const extracted = config.extractArgs(
              (rawArgs ?? {}) as Record<string, unknown>
            );
            if (extracted) setArgs(extracted);

            // directFetch widgets have no server-side prefetch to fetch — the
            // widget's own Apollo client hits the GraphQL API directly instead.
            if (_isDirectFetch) return;

            const toolName = (
              window as { __OT_WIDGET_TOOL__?: string }
            ).__OT_WIDGET_TOOL__;

            if (toolName) {
              try {
                const result = await app.callServerTool({
                  name: "ot_fetch_widget_data",
                  arguments: {
                    tool: toolName,
                    inputJson: JSON.stringify(rawArgs ?? {}),
                  },
                });
                if (result.structuredContent) {
                  applyData(result.structuredContent as PrefetchResult);
                }
              } catch (e) {
                console.error(`[${config.appName}] callServerTool failed:`, e);
              }
            }
          };

          await app.connect();

          const sendHeight = () => {
            const h = Math.max(document.documentElement.scrollHeight, 50);
            app.sendSizeChanged({ height: h }).catch(() => {});
          };

          observer = new ResizeObserver(sendHeight);
          observer.observe(document.documentElement);
          sendHeight();
        } catch (err) {
          console.error(`[${config.appName}] AppBridge connect failed:`, err);
        }
      }

      connect();
      return () => {
        observer?.disconnect();
      };
    }, []);

    if (!args) {
      return (
        <div style={{ padding: "24px", color: "#718096", fontFamily: "sans-serif" }}>
          Connecting…
        </div>
      );
    }

    const Widget = config.component;
    return (
      <ApolloProvider client={apolloClient}>
        <MemoryRouter>
          <Widget {...args} />
        </MemoryRouter>
      </ApolloProvider>
    );
  }

  const rootEl = document.getElementById("root");
  if (rootEl) {
    createRoot(rootEl).render(
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Root />
        </ThemeProvider>
      </CacheProvider>
    );
  }
}
