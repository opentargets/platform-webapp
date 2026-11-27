import { test as base, expect } from "@playwright/test";
import type { TestConfig } from "../types";
import { GraphQLMonitor } from "../utils/graphqlMonitor";
import { isKnownApiError } from "./knownApiErrors";
import { getTestConfig } from "./testConfig";

/**
 * Default base URL for tests
 */
const DEFAULT_BASE_URL = "http://localhost:3000";

/**
 * Canary mode: every GraphQL request is aborted, so no widget can load data.
 * A test that still passes in this mode cannot detect a broken page.
 * See `yarn test:canary`.
 */
const CANARY = process.env.E2E_CANARY === "1";

/**
 * Extended test fixtures with test configuration
 */
type TestFixtures = {
  testConfig: TestConfig;
  baseURL: string;
  graphqlMonitor: GraphQLMonitor;
  canary: undefined;
  failOnGraphQLErrors: undefined;
};

/**
 * Extend Playwright test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: <an empty pattern is required>
  testConfig: async ({}, use) => {
    const config = await getTestConfig();
    await use(config);
  },
  // biome-ignore lint/correctness/noEmptyPattern: <an object pattern is required by playwright config empty or not>
  baseURL: async ({}, use) => {
    const url = process.env.PLAYWRIGHT_TEST_BASE_URL || DEFAULT_BASE_URL;
    await use(url);
  },

  graphqlMonitor: async ({ page }, use) => {
    const monitor = new GraphQLMonitor(page);
    await monitor.start();
    await use(monitor);
    await monitor.stop();
  },

  canary: [
    async ({ page }, use) => {
      if (CANARY) {
        await page.route("**/graphql", (route) => route.abort());
      }
      await use(undefined);
    },
    { auto: true },
  ],

  // Any GraphQL error in a response fails the test, unless it is listed in
  // knownApiErrors.ts. Before this, errors were only logged.
  failOnGraphQLErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      const pending: Promise<void>[] = [];

      page.on("response", (response) => {
        const request = response.request();
        if (!response.url().includes("graphql") || request.method() !== "POST") return;

        pending.push(
          response
            .json()
            .then((body) => {
              const operationName = request.postDataJSON()?.operationName ?? "Unknown";
              for (const error of body?.errors ?? []) {
                if (!isKnownApiError(operationName, error.message)) {
                  errors.push(`${operationName}: ${error.message}`);
                }
              }
            })
            .catch(() => {
              // Body unavailable (aborted, navigated away): nothing to inspect
            })
        );
      });

      await use(undefined);

      if (CANARY) return;
      await Promise.all(pending);
      expect(errors, "GraphQL responses contained errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
