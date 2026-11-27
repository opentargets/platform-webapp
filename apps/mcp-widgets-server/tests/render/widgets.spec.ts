/**
 * Renders every registered widget the way an MCP Apps host does and checks that it
 * actually shows something: tools/call → resources/read → sandboxed iframe with the
 * declared CSP → ui/initialize → tool-input / tool-result → wait for the section's
 * queries to settle → inspect the DOM.
 *
 * Each test writes one row of the status matrix to test-results/render-matrix/.
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { expect, test, type Request } from "@playwright/test";
import { WIDGET_REGISTRY } from "../../src/widgets/index.js";
import { argsFor } from "./fixtures";
import { HOST_BUNDLE } from "./global-setup";
import { buildCsp, connectMcp } from "./mcp-client";

const HOST_URL = "http://render-host.test/";
export const MATRIX_DIR = resolve(import.meta.dirname, "../../test-results/render-matrix");

/** Texts the sections show in place of data when a fetch fails */
const ERROR_TEXTS = /Could not download|Something went wrong|Error loading|Failed to fetch/i;

/** How long the widget's requests must be quiet before we consider it rendered */
const SETTLE_MS = 2000;

/**
 * Beyond this many external requests a widget is looping; the rest are aborted so a
 * test run can't flood a third-party API (a looping widget once sent ~23k requests to
 * Europe PMC in one run, and EBI then throttled the machine).
 */
const MAX_REQUESTS = 300;

/** Widgets not rendered at all, with why. Remove an entry once its bug is fixed. */
const SKIP: Record<string, string> = {
  get_evidence_europe_pmc_widget: "requests Europe PMC in a loop",
};

for (const def of WIDGET_REGISTRY) {
  const paramNames = (def.inputParams ?? [def.inputParam]).map((p) => p.name);

  test(def.toolName, async ({ page }, testInfo) => {
    test.skip(def.toolName in SKIP, SKIP[def.toolName]);
    const args = argsFor(def.toolName, paramNames);
    const mcp = await connectMcp();
    const toolResult = await mcp.callTool(def.toolName, args);
    const resourceUri = (toolResult._meta as { ui?: { resourceUri?: string } })?.ui?.resourceUri;
    expect(resourceUri, "tool result carries _meta.ui.resourceUri").toBeTruthy();
    const resource = await mcp.readWidget(resourceUri!);
    await mcp.close();

    // ── Collect everything that happens inside the page and the widget iframe ──
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const cspViolations: string[] = [];
    const failedRequests: string[] = [];
    const graphqlErrors: string[] = [];
    let inflight = 0;
    let requests = 0;
    let lastActivity = Date.now();

    const isExternal = (request: Request) =>
      request.url().startsWith("http") && !request.url().startsWith(HOST_URL);

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() !== "error") return;
      (/Refused to|violates the following Content Security Policy/.test(msg.text())
        ? cspViolations
        : consoleErrors
      ).push(msg.text());
    });
    page.on("request", (request) => {
      if (!isExternal(request)) return;
      inflight++;
      requests++;
      lastActivity = Date.now();
    });
    page.on("requestfinished", async (request) => {
      if (!isExternal(request)) return;
      inflight--;
      lastActivity = Date.now();
      if (request.method() !== "POST" || !request.url().includes("graphql")) return;
      const body = await request
        .response()
        .then((response) => response?.json())
        .catch(() => null);
      const operation = request.postDataJSON()?.operationName ?? "anonymous";
      for (const error of body?.errors ?? []) graphqlErrors.push(`${operation}: ${error.message}`);
    });
    page.on("requestfailed", (request) => {
      if (!isExternal(request)) return;
      inflight--;
      lastActivity = Date.now();
      // Blocked by the CSP: reported as a warning, since it can be cosmetic (e.g. web fonts);
      // a blocked data request still fails the test through the checks below.
      const reason = request.failure()?.errorText;
      if (reason?.includes("BLOCKED_BY_CLIENT")) return; // aborted by the request cap
      (reason === "csp" ? cspViolations : failedRequests).push(`${request.url()} — ${reason}`);
    });

    let aborted = 0;
    await page.route(
      (url) => url.protocol.startsWith("http") && !url.href.startsWith(HOST_URL),
      (route) => {
        if (requests <= MAX_REQUESTS) return route.continue();
        aborted++;
        return route.abort("blockedbyclient");
      }
    );

    // ── Mount ──
    const hostJs = await readFile(HOST_BUNDLE, "utf-8");
    await page.route(HOST_URL, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><html><body style="margin:0"><script>${hostJs}</script></body></html>`,
      })
    );
    await page.goto(HOST_URL);
    await page.evaluate((options) => window.renderWidget(options), {
      html: resource.html,
      csp: buildCsp(resource),
      args,
      toolResult: toolResult as Record<string, unknown>,
    });

    // ── Wait for the widget's requests to settle ──
    await expect
      .poll(() => requests > 0 && inflight <= 0 && Date.now() - lastActivity > SETTLE_MS, {
        message: "widget made its requests and they settled",
        timeout: 60_000,
      })
      .toBe(true)
      .catch(() => {});

    const frame = page.frameLocator("#widget");
    await expect(frame.locator(".MuiSkeleton-root"))
      .toHaveCount(0, { timeout: 15_000 })
      .catch(() => {});

    // ── Inspect ──
    const sections = await frame.locator('[data-testid^="section-"]').count();
    const skeletons = await frame.locator(".MuiSkeleton-root").count();
    const text = (await frame.locator("#root").innerText().catch(() => "")).trim();
    const errorText = text.match(ERROR_TEXTS)?.[0];

    // Deduplicated with counts: a request loop would otherwise list the same failure thousands of times
    const counted = (items: string[]) => {
      const counts = new Map<string, number>();
      for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
      return [...counts].map(([item, n]) => (n > 1 ? `${item} (×${n})` : item));
    };
    const problems = [
      ...counted(pageErrors.map((e) => `uncaught: ${e}`)),
      ...counted(graphqlErrors.map((e) => `graphql: ${e}`)),
      ...counted(failedRequests.map((e) => `request failed: ${e}`)),
      ...(requests === 0 ? ["made no requests"] : []),
      ...(aborted > 0 ? [`request loop: over ${MAX_REQUESTS} requests, ${aborted} aborted`] : []),
      ...(sections === 0
        ? ["rendered nothing (section returned null: no data for these IDs, or a failed query)"]
        : []),
      ...(skeletons > 0 ? ["still loading after timeout"] : []),
      ...(errorText ? [`shows "${errorText}"`] : []),
    ];
    const status = problems.length === 0 ? "works" : sections > 0 ? "partial" : "broken";

    // ── Record ──
    const screenshot = testInfo.outputPath("widget.png");
    await page
      .locator("#widget")
      .screenshot({ path: screenshot })
      .catch(() => {});
    await testInfo.attach("widget", { path: screenshot, contentType: "image/png" }).catch(() => {});
    await mkdir(MATRIX_DIR, { recursive: true });
    await writeFile(
      resolve(MATRIX_DIR, `${def.toolName}.json`),
      JSON.stringify(
        {
          tool: def.toolName,
          args,
          status,
          problems,
          consoleErrors,
          cspViolations: [...new Set(cspViolations)],
          requests,
          screenshot,
        },
        null,
        2
      )
    );

    expect(problems, `${def.toolName} with ${JSON.stringify(args)}`).toEqual([]);
  });
}
