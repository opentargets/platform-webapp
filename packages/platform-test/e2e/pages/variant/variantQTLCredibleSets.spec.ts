import { expect, test } from "../../../fixtures";
import { QTLCredibleSetsSection } from "../../../POM/objects/widgets/shared/qtlCredibleSetsSection";
import { VariantPage } from "../../../POM/page/variant/variant";

test.describe("Variant QTL Credible Sets Section", () => {
  let variantPage: VariantPage;
  let qtlSection: QTLCredibleSetsSection;

  test.beforeEach(async ({ page, testConfig }) => {
    variantPage = new VariantPage(page);
    qtlSection = new QTLCredibleSetsSection(page);

    // Navigate to a variant with QTL credible sets data
    await variantPage.goToVariantPage(testConfig.variant.withQTL ?? testConfig.variant.primary);

    // Check if section is visible
    const isVisible = await qtlSection.isSectionVisible();
    if (isVisible) {
      await qtlSection.waitForLoad();
    } else {
      test.skip();
    }
  });

  test("QTL Credible Sets section is visible when data available", async () => {
    const isVisible = await qtlSection.isSectionVisible();
    expect(isVisible).toBe(true);
  });

  test("QTL Credible Sets table displays data", async () => {
    const rowCount = await qtlSection.getTableRows();

    expect(rowCount).toBeGreaterThan(0);
  });

  test("Can click credible set link in table", async ({ page }) => {
    await qtlSection.clickCredibleSetLink(0);

    // Wait for navigation to credible set page
    await page.waitForURL((url) => url.toString().includes("/credible-set/"), { timeout: 5000 });

    // Should navigate to credible set page
    expect(page.url()).toContain("/credible-set/");
  });

  test("Study link is displayed in table", async () => {
    const studyLink = await qtlSection.getStudyLink(0);

    expect(await studyLink.isVisible()).toBe(true);
  });

  test("Can click study link in table", async ({ page }) => {
    await qtlSection.clickStudyLink(0);

    // Wait for navigation to study page
    await page.waitForURL((url) => url.toString().includes("/study/"), { timeout: 5000 });

    // Should navigate to study page
    expect(page.url()).toContain("/study/");
  });

  test("Affected gene link is displayed in table", async () => {
    const geneLink = await qtlSection.getAffectedGeneLink(0);

    expect(await geneLink.isVisible()).toBe(true);
  });

  test("Can click affected gene link in table", async ({ page }) => {
    await qtlSection.clickAffectedGeneLink(0);

    // Wait for navigation to target page
    await page.waitForURL((url) => url.toString().includes("/target/"), { timeout: 5000 });

    // Should navigate to target/gene page
    expect(page.url()).toContain("/target/");
  });

  test("Can search/filter QTL credible sets", async () => {
    // Search for an affected gene symbol present in the table
    const geneLink = await qtlSection.getAffectedGeneLink(0);
    await qtlSection.search((await geneLink.innerText()).trim());

    const filteredRowCount = await qtlSection.getTableRows();

    expect(filteredRowCount).toBeGreaterThan(0);
  });
});
