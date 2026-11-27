import { expect, test } from "../../../fixtures";
import { drugFacts } from "../../../POM/page/drug/drugData";
import { SearchPage } from "../../../POM/page/search/searchPage";

const APP = "Open Targets Platform";

/**
 * The document title of every route (PageMeta): what a browser tab, a bookmark and the
 * history list show. Titles that carry a name wait for the entity's data, so each is
 * asserted with a retrying matcher.
 */
test.describe("Document title", () => {
  test("home page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(APP);
  });

  test("API page", async ({ page }) => {
    await page.goto("/api");
    await expect(page).toHaveTitle(`API | ${APP}`);
  });

  test("metrics page", async ({ page }) => {
    await page.goto("/metrics");
    await expect(page).toHaveTitle(`Data Metrics | ${APP}`);
  });

  test("downloads page", async ({ page }) => {
    await page.goto("/downloads");
    await expect(page).toHaveTitle(/^Data downloads \| Open Targets Platform/);
  });

  test("search page keeps the application title", async ({ page }) => {
    await new SearchPage(page).goto({ q: "BRAF" });
    await expect(page).toHaveTitle(APP);
  });

  test("not found page keeps the application title", async ({ page, pageHealth }) => {
    pageHealth.allow(
      /404 page is displayed/,
      "the test opens a route that does not exist",
      "error-ui"
    );
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByTestId("not-found-page")).toBeVisible();
    await expect(page).toHaveTitle(APP);
  });

  test("target associations and profile pages name the gene", async ({ page, testConfig }) => {
    const id = testConfig.target?.primary as string;
    await page.goto(`/target/${id}/associations`);
    await expect(page).toHaveTitle(`Diseases associated with BRAF | ${APP}`);

    await page.goto(`/target/${id}`);
    await expect(page).toHaveTitle(`BRAF profile page | ${APP}`);
  });

  test("disease associations and profile pages name the disease", async ({ page, testConfig }) => {
    const { primary, name } = testConfig.disease;
    await page.goto(`/disease/${primary}/associations`);
    await expect(page).toHaveTitle(`Targets associated with ${name} | ${APP}`);

    await page.goto(`/disease/${primary}`);
    await expect(page).toHaveTitle(`${name} profile page | ${APP}`);
  });

  test("drug page names the drug", async ({ page, testConfig }) => {
    await page.goto(`/drug/${testConfig.drug.primary}`);
    await expect(page).toHaveTitle(
      `${drugFacts(testConfig.drug.primary).name} profile page | ${APP}`
    );
  });

  test("variant page carries the variant id", async ({ page, testConfig }) => {
    await page.goto(`/variant/${testConfig.variant.primary}`);
    await expect(page).toHaveTitle(`${testConfig.variant.primary} profile page | ${APP}`);
  });

  test("study page carries the study id", async ({ page, testConfig }) => {
    const id = testConfig.study?.gwas.primary as string;
    await page.goto(`/study/${id}`);
    await expect(page).toHaveTitle(`${id} profile page | ${APP}`);
  });

  test("credible set page names the variant and the study", async ({ page, testConfig }) => {
    await page.goto(`/credible-set/${testConfig.credibleSet?.primary}`);
    await expect(page).toHaveTitle(
      new RegExp(
        `^Credible set around \\d+_\\d+_[ACGT]+_[ACGT]+ for ${testConfig.study?.gwas.primary} \\| ${APP}$`
      )
    );
  });

  test("evidence page names the gene and the disease", async ({ page, testConfig }) => {
    const { ensgId, efoId } = testConfig.evidence?.primary as { ensgId: string; efoId: string };
    await page.goto(`/evidence/${ensgId}/${efoId}`);
    await expect(page).toHaveTitle(`Evidence for BRAF and melanoma | ${APP}`);
  });

  test("title follows the page when navigating inside the app", async ({ page }) => {
    await page.goto("/api");
    await expect(page).toHaveTitle(`API | ${APP}`);

    await page.getByRole("banner").getByRole("button", { name: "open header menu" }).click();
    await page.getByRole("menuitem", { name: "Metrics", exact: true }).click();
    await expect(page).toHaveTitle(`Data Metrics | ${APP}`);

    await page.goBack();
    await expect(page).toHaveTitle(`API | ${APP}`);
  });
});
