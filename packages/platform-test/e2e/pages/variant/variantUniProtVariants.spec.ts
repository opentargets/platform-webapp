import { expect, test } from "../../../fixtures";
import { UniProtVariantsSection } from "../../../POM/objects/widgets/shared/uniprotVariantsSection";
import { VariantPage } from "../../../POM/page/variant/variant";

test.describe("UniProt Variants Section", () => {
  let variantPage: VariantPage;
  let uniprotSection: UniProtVariantsSection;

  test.beforeEach(async ({ page, testConfig }) => {
    variantPage = new VariantPage(page);
    uniprotSection = new UniProtVariantsSection(page);

    // Navigate to a variant with UniProt data
    await variantPage.goToVariantPage(testConfig.variant.withMolecularStructure);

    // Check if section is visible
    const isVisible = await uniprotSection.isSectionVisible();
    if (isVisible) {
      await uniprotSection.waitForLoad();
    } else {
      test.skip();
    }
  });

  test("UniProt Variants section is visible when data available", async () => {
    const isVisible = await uniprotSection.isSectionVisible();
    expect(isVisible).toBe(true);
  });

  test("UniProt table displays data", async () => {
    const rowCount = await uniprotSection.getTableRows();

    expect(rowCount).toBeGreaterThan(0);
  });

  test("Disease/phenotype link is displayed in table", async () => {
    const diseasePhenotypeLink = await uniprotSection.getDiseasePhenotypeLink(0);

    expect(await diseasePhenotypeLink.isVisible()).toBe(true);
  });

  test("Can click disease/phenotype link in table", async ({ page }) => {
    await uniprotSection.clickDiseasePhenotypeLink(0);

    // Wait for navigation to disease page using page load state
    await page.waitForURL((url) => url.toString().includes("/disease/"), { timeout: 5000 });
    await page.waitForLoadState("networkidle");

    // Should navigate to disease page
    expect(page.url()).toContain("/disease/");
  });

  test("Disease links are displayed in table", async () => {
    const diseaseCount = await uniprotSection.getDiseaseLinksCount(0);

    expect(diseaseCount).toBeGreaterThan(0);
  });

  test("Can click disease link in table", async ({ page }) => {
    const hasLinks = await uniprotSection.getDiseaseLinksCount(0);

    if (hasLinks > 0) {
      await uniprotSection.clickDiseaseLink(0);

      // Wait for navigation to disease page
      await page.waitForURL((url) => url.toString().includes("/disease/"), { timeout: 5000 });

      // Should navigate to disease page
      expect(page.url()).toContain("/disease/");
    }
  });
});
