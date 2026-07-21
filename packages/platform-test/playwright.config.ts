import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Use 6 workers in CI for faster execution */
  workers: process.env.CI ? 6 : 10,
  /* Increase timeout for CI environments */
  timeout: process.env.CI ? 60000 : 80000,
  /* Default expect() timeout is 5000ms, which doesn't leave enough headroom for
   * lazy-loaded route chunks to fetch on a cold page load (page components are
   * now code-split), on top of normal query latency. */
  expect: {
    timeout: 10000,
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "html",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL
    ? undefined
    : {
        command: "yarn --cwd ../.. dev:platform",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true, // Since we would not want to start a new server and we are using netlify deploy preview URL anyway
      },
});
