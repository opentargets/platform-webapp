import { test } from "../../../fixtures";
import { DiseasePage } from "../../../POM/page/disease/disease";

test.describe("Disease Page - Header and Navigation", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    //if no disease id, skip all tests
    if (!testConfig.disease.primary) {
      test.skip();
    }
    await page.goto(`${baseURL}/disease/${testConfig.disease.primary}/associations`);
  });

  test("Disease header is correctly displayed", { tag: "@smoke" }, async ({ page, testConfig }) => {
    const diseaseName = page.getByTestId("profile-page-header-text");
    await test.expect(diseaseName).toHaveText(testConfig.disease.name || "");
  });

  test("Can navigate to the profile page from the disease page", async ({ page }) => {
    const diseasePage = new DiseasePage(page);
    await diseasePage.goToProfilePage();

    // Verify that the URL is the profile page URL
    await test.expect(page.url()).toBe(diseasePage.getProfilePage());
  });

  test("External links in header are displayed and working", async ({ page, testConfig }) => {
    const diseasePage = new DiseasePage(page);

    // Check for EFO external link
    const efoLink = diseasePage.getEfoLink();
    await test.expect(efoLink).toBeVisible();

    // Verify the EFO link has the correct href
    const efoHref = await diseasePage.getEfoLinkHref();
    test.expect(efoHref).toContain(testConfig.disease.primary);
    test.expect(efoHref).toContain("ebi.ac.uk/ols4/ontologies/efo/terms");

    // Check for cross-reference links (e.g., MONDO, MeSH, etc.)
    const xrefCount = await diseasePage.getXrefLinksCount();

    // Verify that at least one cross-reference link exists
    test.expect(xrefCount).toBeGreaterThan(0);

    // Verify the first xref link has a valid href
    if (xrefCount > 0) {
      const firstXrefHref = await diseasePage.getFirstXrefLinkHref();
      test.expect(firstXrefHref).toBeTruthy();
      test.expect(firstXrefHref).toMatch(/^https?:\/\//);
    }
  });
});
