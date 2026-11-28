import { RESOLVED_CONFIG_ENV, resolveTestConfig } from "./fixtures/testConfig";

/**
 * Resolve the test data once per run and hand it to every worker, so all tests in a run
 * use the same IDs and no test depends on a network call to learn what to test.
 */
export default async function globalSetup(): Promise<void> {
  const config = await resolveTestConfig();
  process.env[RESOLVED_CONFIG_ENV] = JSON.stringify(config);
  const source = process.env.TEST_CONFIG_URL
    ? `sheet scenario "${process.env.TEST_SCENARIO || "testing_scenario_1"}"`
    : "checked-in defaults";
  console.log(`[e2e] test data: ${source}`);
}
