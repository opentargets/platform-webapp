import { expect, test } from "../../../fixtures";
import { EVASection } from "../../../POM/objects/widgets/shared/evaSection";
import { VariantPage } from "../../../POM/page/variant/variant";

test.describe("EVA / ClinVar Section", () => {
  let variantPage: VariantPage;
  let evaSection: EVASection;

  test.beforeEach(async ({ page, testConfig }) => {
    variantPage = new VariantPage(page);
    evaSection = new EVASection(page);

    // Navigate to a variant with ClinVar data
    await variantPage.goToVariantPage(testConfig.variant.withEVA ?? testConfig.variant.primary);

    // Check if section is visible
    const isVisible = await evaSection.isSectionVisible();
    if (isVisible) {
      await evaSection.waitForLoad();
    } else {
      test.skip();
    }
  });

  test("EVA/ClinVar section is visible when data available", async () => {
    const isVisible = await evaSection.isSectionVisible();
    expect(isVisible).toBe(true);
  });

  test("ClinVar table displays data", async () => {
    const rowCount = await evaSection.getTableRows();

    expect(rowCount).toBeGreaterThan(0);
  });

  test("Disease links are displayed in table", async () => {
    const diseaseLink = await evaSection.getDiseaseLink(0);

    expect(await diseaseLink.isVisible()).toBe(true);
  });

  test("Can click disease link in table", async ({ page }) => {
    await evaSection.clickDiseaseLink(0);

    // Wait for navigation to disease page
    await page.waitForURL((url) => url.toString().includes("/disease/"), { timeout: 5000 });

    // Should navigate to disease page
    expect(page.url()).toContain("/disease/");
  });

  test("Clinical significance is displayed", async () => {
    const significance = await evaSection.getClinicalSignificance(0);

    expect(significance).not.toBeNull();
    expect(significance).not.toBe("");
  });
});
