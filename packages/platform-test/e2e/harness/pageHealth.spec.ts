import { expect, test } from "../../fixtures";

/**
 * The page health guard is what makes every other test fail when a page breaks, so it
 * is tested itself: each test breaks the app in one specific way and checks the guard
 * saw it. If one of these fails, a green run of the rest of the suite proves nothing.
 */
test.describe("Page health guard", () => {
  test("a healthy page records no problems @smoke", async ({ page, pageHealth }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /Open Targets Platform/ }).first()
    ).toBeVisible();
    expect(await pageHealth.collect()).toEqual([]);
  });

  test("records a GraphQL response that carries errors @smoke", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    await page.route("**/*", async (route) => {
      const body = route.request().postData();
      if (route.request().method() === "POST" && body?.includes('"query"')) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: null, errors: [{ message: "injected GraphQL failure" }] }),
        });
        return;
      }
      await route.fallback();
    });
    pageHealth.allow(/./, "this test breaks every GraphQL query on purpose");

    await page.goto(`/drug/${testConfig.drug.primary}`);
    await expect
      .poll(async () => {
        await pageHealth.collect();
        return pageHealth.all().filter((problem) => problem.kind === "graphql-error").length;
      })
      .toBeGreaterThan(0);
    const graphqlErrors = pageHealth.all().filter((problem) => problem.kind === "graphql-error");
    expect(graphqlErrors[0].message).toContain("injected GraphQL failure");
  });

  test("records a GraphQL request that returns HTTP 500 @smoke", async ({
    page,
    pageHealth,
    testConfig,
  }) => {
    await page.route("**/*", async (route) => {
      const body = route.request().postData();
      if (route.request().method() === "POST" && body?.includes('"query"')) {
        await route.fulfill({ status: 500, contentType: "text/plain", body: "upstream exploded" });
        return;
      }
      await route.fallback();
    });
    pageHealth.allow(/./, "this test makes the API return HTTP 500 on purpose");

    await page.goto(`/target/${testConfig.target?.primary}`);
    await expect
      .poll(() => pageHealth.all().some((problem) => /HTTP 500/.test(problem.message)))
      .toBe(true);
  });

  test("records an uncaught exception in the page @smoke", async ({ page, pageHealth }) => {
    pageHealth.allow(/injected uncaught exception/, "thrown by this test", "page-error");
    await page.goto("/");
    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("injected uncaught exception");
      }, 0);
    });
    await expect
      .poll(() => pageHealth.all().filter((problem) => problem.kind === "page-error").length)
      .toBe(1);
  });

  test("records an unlisted console.error and ignores nothing by default", async ({
    page,
    pageHealth,
  }) => {
    pageHealth.allow(/injected console error/, "logged by this test", "console-error");
    await page.goto("/");
    await page.evaluate(() => console.error("injected console error"));
    await expect
      .poll(() => pageHealth.all().filter((problem) => problem.kind === "console-error").length)
      .toBe(1);
  });

  test("records the 404 page as error UI @smoke", async ({ page, pageHealth }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "this test opens a route that does not exist",
      "error-ui"
    );
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByTestId("not-found-page")).toBeVisible();
    await pageHealth.collect();
    expect(pageHealth.all().map((problem) => problem.kind)).toContain("error-ui");
  });

  test("an allow rule only covers the problem it names", async ({ page, pageHealth }) => {
    pageHealth.allow(/first injected error/, "logged by this test", "console-error");
    pageHealth.allow(/second injected error/, "logged by this test", "console-error");
    await page.goto("/");
    await page.evaluate(() => console.error("first injected error"));
    await expect.poll(() => pageHealth.all().length).toBe(1);
    expect(pageHealth.unexpected()).toEqual([]);

    // A rule for one message must not hide a different one.
    await page.evaluate(() => console.error("second injected error"));
    await expect.poll(() => pageHealth.all().length).toBe(2);
    const onlyFirstAllowed = pageHealth
      .all()
      .filter((problem) => !/first injected error/.test(problem.message));
    expect(onlyFirstAllowed).toHaveLength(1);
    expect(onlyFirstAllowed[0].message).toContain("second injected error");
  });
});
