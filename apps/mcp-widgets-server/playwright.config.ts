import { defineConfig, devices } from "@playwright/test";

/**
 * Widget render tests: `yarn build` first, then `yarn test:render`.
 * Starts the widget server on :3001 unless one is already running (e.g. `yarn dev`).
 */
export default defineConfig({
  testDir: "./tests/render",
  globalSetup: "./tests/render/global-setup.ts",
  globalTeardown: "./tests/render/global-teardown.ts",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 120_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { ...devices["Desktop Chrome"], viewport: { width: 900, height: 800 } },
  webServer: {
    command: "yarn start",
    url: "http://localhost:3001/status",
    reuseExistingServer: true,
  },
});
