/**
 * Minimal MCP Apps host for the render tests. Runs in the browser page that
 * Playwright opens, and plays the part of Claude / ChatGPT / MCPJam: it loads a
 * widget's HTML into a sandboxed iframe and talks to it through the real
 * AppBridge from @modelcontextprotocol/ext-apps.
 *
 * Bundled to an IIFE by global-setup.ts.
 */

import { AppBridge, PostMessageTransport } from "@modelcontextprotocol/ext-apps/app-bridge";

export interface RenderWidgetOptions {
  /** Widget HTML exactly as returned by resources/read */
  html: string;
  /** Content-Security-Policy to apply inside the iframe, built from the resource's _meta.ui.csp */
  csp: string;
  /** Tool arguments, sent with ui/notifications/tool-input */
  args: Record<string, unknown>;
  /** Tool result as returned by tools/call, sent with ui/notifications/tool-result */
  toolResult: Record<string, unknown>;
}

declare global {
  interface Window {
    renderWidget: (options: RenderWidgetOptions) => Promise<void>;
  }
}

/** Inserts the CSP as the first element of <head>, before any widget script runs. */
function withCsp(html: string, csp: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, "&quot;")}">`;
  return html.replace(/<head>/i, `<head>${meta}`);
}

window.renderWidget = async ({ html, csp, args, toolResult }) => {
  const iframe = document.createElement("iframe");
  iframe.id = "widget";
  iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
  iframe.style.cssText = "display:block;width:100%;height:200px;border:0";
  document.body.appendChild(iframe);

  const bridge = new AppBridge(
    null,
    { name: "ot-render-test", version: "0.0.0" },
    { openLinks: {} }
  );
  bridge.onsizechange = ({ height }) => {
    if (height) iframe.style.height = `${height}px`;
  };
  bridge.onopenlink = async () => ({});
  const initialized = new Promise<void>((resolve) => {
    bridge.oninitialized = () => resolve();
  });

  // Connect before the document loads so the widget's ui/initialize is never missed.
  await bridge.connect(new PostMessageTransport(iframe.contentWindow!, iframe.contentWindow!));
  iframe.srcdoc = withCsp(html, csp);

  await initialized;
  await bridge.sendToolInput({ arguments: args });
  await bridge.sendToolResult(toolResult as Parameters<AppBridge["sendToolResult"]>[0]);
};
