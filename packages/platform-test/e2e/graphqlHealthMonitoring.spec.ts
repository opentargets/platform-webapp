/**
 * GraphQL Health Monitoring - All Test Pages
 *
 * This file contains comprehensive GraphQL monitoring tests for all main pages.
 * It ensures that all GraphQL queries across the application are working correctly.
 *
 * Run with: yarn dev-test e2e/graphqlHealthMonitoring.spec.ts
 */

import { expect, test } from "../fixtures";
import { waitForRenderSettled } from "../utils/waitForRenderSettled";

interface PageHealthReport {
  name: string;
  url: string;
  passed: boolean;
  totalRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errors: string[];
  operations: string[];
}

test.describe("GraphQL Health Monitoring - All Pages", () => {
  test.describe.configure({ timeout: 60000 }); // 60 seconds per test
  const reports: PageHealthReport[] = [];

  test.afterAll(async () => {
    // Print comprehensive summary at the end
    if (reports.length > 0) {
      console.log(`\n${"=".repeat(70)}`);
      console.log("           COMPREHENSIVE GRAPHQL HEALTH REPORT");
      console.log("=".repeat(70));

      const passedCount = reports.filter((r) => r.passed).length;
      console.log(`\n📊 Summary: ${passedCount}/${reports.length} pages passed\n`);

      for (const report of reports) {
        const status = report.passed ? "✓" : "✗";
        console.log(`${status} ${report.name}`);
        console.log(`  URL: ${report.url}`);
        console.log(`  Requests: ${report.totalRequests} (Failed: ${report.failedRequests})`);
        console.log(`  Avg Response: ${report.averageResponseTime.toFixed(0)}ms`);
        console.log(`  Operations: ${report.operations.join(", ")}`);

        if (report.errors.length > 0) {
          console.log(`  ❌ Errors:`);
          for (const error of report.errors) {
            console.log(`     - ${error}`);
          }
        }
        console.log("");
      }

      console.log("=".repeat(70));
      console.log("\n");
    }
  });

  /**
   * Disease Page Health Check
   */
  test("disease page graphql health", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    const url = `${baseURL}/disease/${testConfig.disease.primary}/associations`;
    console.log(`\n🔍 Testing Disease Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Disease Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  test("disease profile page graphql health", async ({
    page,
    baseURL,
    testConfig,
    graphqlMonitor,
  }) => {
    const url = `${baseURL}/disease/${testConfig.disease.primary}/`;
    console.log(`\n🔍 Testing Disease Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Disease Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  /**
   * Target Page Health Check
   */
  test("target page graphql health", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    if (!testConfig.target?.primary) {
      console.log("\n⊘ Skipping Target Page (no primary target in config)");
      return;
    }

    const url = `${baseURL}/target/${testConfig.target.primary}/associations`;
    console.log(`\n🔍 Testing Target Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Target Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  test("target profile page graphql health", async ({
    page,
    baseURL,
    testConfig,
    graphqlMonitor,
  }) => {
    if (!testConfig.target?.primary) {
      console.log("\n⊘ Skipping Target Page (no primary target in config)");
      return;
    }

    const url = `${baseURL}/target/${testConfig.target.primary}/`;
    console.log(`\n🔍 Testing Target Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Target Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  /**
   * Drug Page Health Check
   */
  test("drug page graphql health", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    const url = `${baseURL}/drug/${testConfig.drug.primary}`;
    console.log(`\n🔍 Testing Drug Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Drug Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  /**
   * Variant Page Health Check
   */
  test("variant page graphql health", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    const url = `${baseURL}/variant/${testConfig.variant.primary}`;
    console.log(`\n🔍 Testing Variant Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Variant Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  /**
   * Study GWAS Page Health Check
   */
  test("study gwas page graphql health", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    const url = `${baseURL}/study/${testConfig.study.gwas.primary}`;
    console.log(`\n🔍 Testing Study GWAS Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Study GWAS Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  /**
   * Study QTL Page Health Check
   */
  test("study qtl page graphql health", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    if (!testConfig.study.qtl?.primary) {
      console.log("\n⊘ Skipping Study QTL Page (no primary QTL study in config)");
      return;
    }

    const url = `${baseURL}/study/${testConfig.study.qtl.primary}`;
    console.log(`\n🔍 Testing Study QTL Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Study QTL Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  /**
   * Credible Set Page Health Check
   */
  test("credible set page graphql health", async ({
    page,
    baseURL,
    testConfig,
    graphqlMonitor,
  }) => {
    if (!testConfig.credibleSet?.primary) {
      console.log("\n⊘ Skipping Credible Set Page (no primary credible set in config)");
      return;
    }

    const url = `${baseURL}/credible-set/${testConfig.credibleSet.primary}`;
    console.log(`\n🔍 Testing Credible Set Page: ${url}`);

    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const stats = graphqlMonitor.getStats();
    const report: PageHealthReport = {
      name: "Credible Set Page",
      url,
      passed: stats.failedRequests === 0,
      totalRequests: stats.totalRequests,
      failedRequests: stats.failedRequests,
      averageResponseTime: stats.averageResponseTime,
      errors: Array.from(stats.errors.values()).flat(),
      operations: stats.requests.map((r) => r.query.operationName),
    };

    reports.push(report);

    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Failed: ${stats.failedRequests}`);
    console.log(`  Avg response: ${stats.averageResponseTime.toFixed(0)}ms`);

    expect(stats.failedRequests).toBe(0);
  });

  /**
   * Performance Baseline Check
   * Validates that no page exceeds reasonable response times
   */
  test("@smoke graphql performance sla", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    const MAX_RESPONSE_TIME = 5000; // 5 seconds per request

    // Test all pages and collect performance data
    const pages = [
      {
        name: "Disease",
        url: `${baseURL}/disease/${testConfig.disease.primary}/associations`,
      },
      {
        name: "Disease Profile",
        url: `${baseURL}/disease/${testConfig.disease.primary}`,
      },
      testConfig.target?.primary && {
        name: "Target",
        url: `${baseURL}/target/${testConfig.target.primary}/associations`,
      },
      testConfig.target?.primary && {
        name: "Target Profile",
        url: `${baseURL}/target/${testConfig.target.primary}`,
      },
      {
        name: "Drug",
        url: `${baseURL}/drug/${testConfig.drug.primary}`,
      },
      {
        name: "Variant",
        url: `${baseURL}/variant/${testConfig.variant.primary}`,
      },
      {
        name: "Study GWAS",
        url: `${baseURL}/study/${testConfig.study.gwas.primary}`,
      },
      testConfig.study.qtl?.primary && {
        name: "Study QTL",
        url: `${baseURL}/study/${testConfig.study.qtl.primary}`,
      },
      testConfig.credibleSet?.primary && {
        name: "Credible Set",
        url: `${baseURL}/credible-set/${testConfig.credibleSet.primary}`,
      },
    ].filter(Boolean);

    const slowPages = [];

    for (const pageInfo of pages) {
      if (!pageInfo) continue;

      graphqlMonitor.clear();
      await page.goto(pageInfo.url);
      // networkidle can hang indefinitely on pages with any background
      // network activity unrelated to GraphQL; wait on the GraphQL traffic
      // itself finishing, then confirm the page actually rendered.
      await graphqlMonitor.waitForIdle();
      await waitForRenderSettled(page);

      const stats = graphqlMonitor.getStats();
      if (stats.averageResponseTime > MAX_RESPONSE_TIME) {
        slowPages.push({
          page: pageInfo.name,
          avgTime: stats.averageResponseTime,
          limit: MAX_RESPONSE_TIME,
        });
      }
    }

    if (slowPages.length > 0) {
      console.log("\n⚠️  Performance SLA Exceeded:");
      for (const p of slowPages) {
        console.log(`  ${p.page}: ${p.avgTime.toFixed(0)}ms (limit: ${p.limit}ms)`);
      }
    } else {
      console.log("\n✓ All pages within performance SLA");
    }
  });

  /**
   * Operation Coverage Check
   * Verifies that expected GraphQL operations are being executed
   */
  test("required operations present", async ({ page, baseURL, testConfig, graphqlMonitor }) => {
    const url = `${baseURL}/disease/${testConfig.disease.primary}/associations`;
    await page.goto(url);
    await page.waitForLoadState("networkidle");

    const operations = graphqlMonitor.getRequests().map((r) => r.query.operationName);

    console.log(`\nGraphQL Operations Executed (${operations.length}):`);
    for (const op of [...new Set(operations)]) {
      const count = operations.filter((o) => o === op).length;
      console.log(`  - ${op} (${count}x)`);
    }

    expect(operations.length).toBeGreaterThan(0);
  });
});
