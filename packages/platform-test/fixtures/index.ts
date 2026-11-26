import { test as base } from "@playwright/test";
import type { TestConfig } from "../types";
import { installFault } from "../utils/faultInjection";
import { GraphQLMonitor } from "../utils/graphqlMonitor";
import { formatProblems, PageHealth } from "../utils/pageHealth";
import { getTestConfig } from "./testConfig";

type TestFixtures = {
  /**
   * Records uncaught errors, GraphQL errors, failed requests and error UI for the test's
   * page, and fails the test if any happened. Attached to every test automatically;
   * request it only to `allow(...)` a problem the test provokes on purpose.
   */
  pageHealth: PageHealth;
  /** Applies OT_E2E_FAULT, when set, to check that the tests fail on a broken page. */
  faultInjection: void;
  /** Keeps Netlify's "Collaborate on this Deploy Preview" toolbar off the page. */
  noDeployPreviewToolbar: void;
  graphqlMonitor: GraphQLMonitor;
};

type WorkerFixtures = {
  /** The IDs under test, resolved once per run by global setup. */
  testConfig: TestConfig;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  testConfig: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires an object pattern
    async ({}, use) => {
      await use(getTestConfig());
    },
    { scope: "worker" },
  ],

  pageHealth: [
    async ({ page, baseURL }, use, testInfo) => {
      const health = new PageHealth(page, baseURL);
      await use(health);
      const unexpected = await health.collect();
      health.dispose();
      if (health.all().length > 0) {
        await testInfo.attach("page-health", {
          body: JSON.stringify(health.all(), null, 2),
          contentType: "application/json",
        });
      }
      if (unexpected.length > 0) throw new Error(formatProblems(unexpected));
    },
    { auto: true },
  ],

  noDeployPreviewToolbar: [
    async ({ page }, use) => {
      // Netlify injects this toolbar into every deploy preview. It sits over the bottom of
      // the viewport and intercepts clicks meant for the app; it is not part of the app.
      await page.route(/\/\.netlify\/scripts\/cdp(\?|$)|^https:\/\/netlify-cdp-loader\.netlify\.app\//, (route) =>
        route.abort()
      );
      await use();
    },
    { auto: true },
  ],

  faultInjection: [
    async ({ page }, use) => {
      const installed = await installFault(page);
      await use();
      // Requests still in flight when the test ends would otherwise fail in the handler.
      if (installed) await page.unrouteAll({ behavior: "ignoreErrors" });
    },
    { auto: true },
  ],

  graphqlMonitor: async ({ page }, use) => {
    const monitor = new GraphQLMonitor(page);
    await monitor.start();
    await use(monitor);
    await monitor.stop();
  },
});

export { expect } from "@playwright/test";
