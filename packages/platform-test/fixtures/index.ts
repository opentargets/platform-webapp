import { test as base } from "@playwright/test";
import type { TestConfig } from "../types";
import { getTestConfig } from "./testConfig";

/**
 * Default base URL for tests
 */
const DEFAULT_BASE_URL = "http://localhost:3000";

/**
 * Extended test fixtures with test configuration
 */
type TestFixtures = {
  testConfig: TestConfig;
  baseURL: string;
};

/**
 * Extend Playwright test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  // biome-ignore lint/correctness/noEmptyPattern: <an empty pattern is required>
  testConfig: async ({}, use) => {
    // Fetch configuration once per test
    const config = await getTestConfig();
    await use(config);
  },
  // biome-ignore lint/correctness/noEmptyPattern: <an object pattern is required by playwright config empty or not>
  baseURL: async ({}, use) => {
    const url = process.env.PLAYWRIGHT_TEST_BASE_URL || DEFAULT_BASE_URL;
    await use(url);
  },
});

export { expect } from "@playwright/test";
