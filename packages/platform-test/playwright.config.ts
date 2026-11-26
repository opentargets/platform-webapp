import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const workers = process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 4;

/* Video replays. A video is kept only for a failed test, in CI, which keeps the
 * published report small. PLAYWRIGHT_VIDEO=retain-on-failure does the same locally;
 * PLAYWRIGHT_VIDEO=on records every test. */
type VideoMode = "off" | "on" | "retain-on-failure" | "on-first-retry";
const video = (process.env.PLAYWRIGHT_VIDEO as VideoMode | undefined) ?? (isCI ? "retain-on-failure" : "off");

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./globalSetup.ts",
  fullyParallel: true,
  /* A committed test.only would silently skip the rest of the suite. */
  forbidOnly: isCI,
  /* One retry in CI, to capture a trace. A test that passes only on retry is reported
   * as flaky; it is not a clean pass. */
  retries: isCI ? 1 : 0,
  /* The app talks to a live API: more parallel pages mean slower responses, not a
   * faster run. Override with PLAYWRIGHT_WORKERS. */
  workers,
  timeout: 90_000,
  expect: {
    /* Covers a cold lazy-loaded route chunk plus a slow query. */
    timeout: 20_000,
  },
  reporter: isCI
    ? [
        ["list"],
        ["github"],
        ["html", { open: "never" }],
        /* Read by the workflow to summarise the run on the pull request. */
        ["json", { outputFile: "e2e-results.json" }],
      ]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    trace: isCI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
    video,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  /* Run the local dev server unless a deployed URL was given. */
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL
    ? undefined
    : {
        command: "yarn --cwd ../.. dev:platform",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
