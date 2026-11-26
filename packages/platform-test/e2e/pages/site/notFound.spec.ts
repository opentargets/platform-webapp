import { expect, test } from "../../../fixtures";
import { ErrorPages } from "../../../POM/page/site/errorPages";

/**
 * Routes that must end on the 404 page: an unknown route, and an id that does not exist
 * or is malformed for each kind of entity page.
 */
test.describe("404 page", () => {
  test("an unknown route shows the 404 page with its links @smoke", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "opens a route that does not exist", "error-ui");
    const errors = new ErrorPages(page);
    await page.goto("/this-route-does-not-exist");

    await expect(errors.notFound).toBeVisible();
    await expect(errors.notFoundHeading).toBeVisible();
    await expect(errors.notFound).toContainText("We can't find the page you're looking for.");
    await expect(errors.documentationLink).toHaveAttribute("href", /^https:\/\/platform-docs\.opentargets\.org/);
    await expect(errors.communityLink).toHaveAttribute("href", /^https:\/\/community\.opentargets\.org/);
    await expect(errors.homeLink).toHaveAttribute("href", "/");
    await expect(errors.routeError).toHaveCount(0);
    await expect(errors.profileContent).toHaveCount(0);
  });

  test("a deeply nested unknown route shows the 404 page", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "opens a nested route that does not exist", "error-ui");
    const errors = new ErrorPages(page);
    await page.goto("/a/b/c/d?x=1#frag");

    await expect(errors.notFoundHeading).toBeVisible();
  });

  test("the home link of the 404 page leads to a healthy home page", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "opens a route that does not exist", "error-ui");
    const errors = new ErrorPages(page);
    await page.goto("/this-route-does-not-exist");
    await errors.homeLink.click();

    await expect(page).toHaveURL(/\/$/);
    await expect(errors.notFound).toHaveCount(0);
    await expect(page.getByTestId("global-search-input-trigger")).toBeVisible();
    await expect(page).toHaveTitle("Open Targets Platform");
  });

  const entities: { kind: string; missing: string; malformed: string }[] = [
    { kind: "target", missing: "/target/ENSG00000000000", malformed: "/target/not-a-target-id" },
    { kind: "disease", missing: "/disease/EFO_0000000000", malformed: "/disease/not-a-disease-id" },
    { kind: "drug", missing: "/drug/CHEMBL0000000000", malformed: "/drug/not-a-drug-id" },
    { kind: "variant", missing: "/variant/1_1_A_C", malformed: "/variant/not-a-variant" },
    { kind: "study", missing: "/study/GCST00000000000", malformed: "/study/not-a-study" },
    {
      kind: "credible-set",
      missing: "/credible-set/00000000000000000000000000000000",
      malformed: "/credible-set/not-a-credible-set",
    },
  ];

  for (const { kind, missing, malformed } of entities) {
    for (const [what, path] of [
      ["a well-formed id that does not exist", missing],
      ["a malformed id", malformed],
    ] as const) {
      test(`${kind}: ${what} shows the 404 page and the home link works`, async ({ page, pageHealth }) => {
        pageHealth.allow(/404 page is displayed/, `opens a ${kind} that does not exist`, "error-ui");
        const errors = new ErrorPages(page);
        await page.goto(path);

        await expect(errors.notFound).toBeVisible();
        await expect(errors.notFoundHeading).toBeVisible();
        await expect(errors.routeError, "the 404 page, not the route error page").toHaveCount(0);
        await expect(errors.profileContent).toHaveCount(0);
        await expect(errors.homeLink).toHaveAttribute("href", "/");

        await errors.homeLink.click();
        await expect(page).toHaveURL(/\/$/);
        await expect(errors.notFound).toHaveCount(0);
        await expect(page.getByTestId("global-search-input-trigger")).toBeVisible();
      });
    }
  }
});
