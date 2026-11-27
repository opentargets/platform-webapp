import type { Page, Request } from "@playwright/test";
import { expect, test } from "../fixtures";

/**
 * Regression test for opentargets/issues#4753.
 *
 * Navigating client-side between two pages of the same entity type (drug →
 * drug, target → target, …) reuses the same page components with a new id.
 * When the router rendered that navigation inside a React transition, the
 * hidden (new) render and the visible (old) render fought over the same
 * Apollo `useQuery` instances: each render switched the queries' variables to
 * its own id and sent a request, so the page flickered and fired hundreds of
 * GraphQL requests alternating between the old and the new id.
 *
 * These tests navigate client-side (no document reload), record every GraphQL
 * request sent after the navigation, and check that the old entity is never
 * requested again and that the number of requests stays close to a single
 * page load.
 */

type EntityCase = {
  entity: string;
  from: string;
  to: string;
};

const CASES: EntityCase[] = [
  { entity: "drug", from: "CHEMBL25", to: "CHEMBL1201583" },
  { entity: "target", from: "ENSG00000157764", to: "ENSG00000141510" },
  { entity: "disease", from: "MONDO_0005068", to: "MONDO_0004975" },
  { entity: "variant", from: "1_154453788_C_T", to: "19_44908822_C_T" },
];

/** Time without new GraphQL requests after which the page counts as settled */
const QUIET_MS = 2000;
/**
 * Generous upper bound on requests for one navigation. A normal entity
 * navigation sends a set of requests close to a single page load (~10–40
 * depending on the entity); the loop sent hundreds.
 */
const MAX_REQUESTS_PER_NAVIGATION = 80;

function graphqlVariables(request: Request): Record<string, unknown> | null {
  if (request.method() !== "POST" || !request.url().includes("graphql")) return null;
  try {
    return JSON.parse(request.postData() || "{}").variables ?? {};
  } catch {
    return {};
  }
}

/**
 * Navigate the way the app's router sees a browser back/forward: push a new
 * history entry and dispatch `popstate`. The document is not reloaded.
 */
async function navigateClientSide(page: Page, path: string): Promise<void> {
  await page.evaluate((nextPath) => {
    window.history.pushState(null, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
  }, path);
}

async function waitForQuietNetwork(lastRequestAt: () => number): Promise<void> {
  await expect
    .poll(() => Date.now() - lastRequestAt(), { timeout: 30000, intervals: [250] })
    .toBeGreaterThan(QUIET_MS);
}

for (const { entity, from, to } of CASES) {
  test(`navigating ${entity} → ${entity} does not refetch the previous ${entity}`, async ({
    page,
  }) => {
    test.setTimeout(120000);

    let lastRequestAt = Date.now();
    let requests: string[] = [];
    page.on("request", (request) => {
      const variables = graphqlVariables(request);
      if (!variables) return;
      lastRequestAt = Date.now();
      requests.push(JSON.stringify(variables));
    });

    await page.goto(`/${entity}/${from}`);
    await expect(page.getByTestId("profile-page-header-text").first()).toBeVisible({
      timeout: 60000,
    });
    await waitForQuietNetwork(() => lastRequestAt);

    // The loop depends on render timing, so a single navigation does not
    // always trigger it: go back and forth a few times.
    const route = [to, from, to, from];
    let previous = from;
    for (const next of route) {
      requests = [];
      // Start the quiet window at the navigation, not at the previous request
      lastRequestAt = Date.now();
      await navigateClientSide(page, `/${entity}/${next}`);
      await expect(page).toHaveURL(new RegExp(`/${entity}/${next}$`));
      await waitForQuietNetwork(() => lastRequestAt);

      const previousEntityRequests = requests.filter((v) => v.includes(`"${previous}"`));
      const nextEntityRequests = requests.filter((v) => v.includes(`"${next}"`));
      console.log(
        `[${entity}] ${previous} → ${next}: ${requests.length} GraphQL requests ` +
          `(${nextEntityRequests.length} for ${next}, ${previousEntityRequests.length} for ${previous})`
      );

      expect.soft(nextEntityRequests.length, `requests for ${next}`).toBeGreaterThan(0);
      expect
        .soft(previousEntityRequests, `requests for ${previous} after leaving it`)
        .toHaveLength(0);
      expect
        .soft(requests.length, `requests for ${previous} → ${next}`)
        .toBeLessThanOrEqual(MAX_REQUESTS_PER_NAVIGATION);
      previous = next;
    }
  });
}
