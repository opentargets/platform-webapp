import { expect, test } from "../../../fixtures";
import { ErrorPages } from "../../../POM/page/site/errorPages";

/**
 * /projects and /analysis are partner-only. On the public profile the PrivateRoute
 * guard redirects them to /404, which renders the 404 page.
 */
test.describe("Private routes on the public profile", () => {
  for (const route of ["/projects", "/analysis"]) {
    test(`${route} redirects to the 404 page`, async ({ page, pageHealth }) => {
      pageHealth.allow(
        /404 page is displayed/,
        `opens the partner-only route ${route}`,
        "error-ui"
      );
      const errors = new ErrorPages(page);
      await page.goto(route);

      await expect(page).toHaveURL(/\/404$/);
      await expect(errors.notFoundHeading).toBeVisible();
      await expect(errors.routeError).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /projects|analysis/i })).toHaveCount(0);
      await expect(errors.homeLink).toHaveAttribute("href", "/");
    });

    test(`${route} replaces history: back does not return to the private route`, async ({
      page,
      pageHealth,
    }) => {
      pageHealth.allow(
        /404 page is displayed/,
        `opens the partner-only route ${route}`,
        "error-ui"
      );
      const errors = new ErrorPages(page);
      await page.goto("/search?q=braf&page=1");
      await page.goto(route);
      await expect(page).toHaveURL(/\/404$/);
      await expect(errors.notFound).toBeVisible();

      await page.goBack();
      await expect(page).toHaveURL(/\/search\?q=braf&page=1$/);
      await expect(errors.notFound).toHaveCount(0);
    });
  }

  test("a sub-route of a private route shows the 404 page", async ({ page, pageHealth }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "opens an unknown sub-route of /projects",
      "error-ui"
    );
    const errors = new ErrorPages(page);
    await page.goto("/projects/some-project");

    await expect(errors.notFoundHeading).toBeVisible();
  });
});
