import { expect, test } from "../../../fixtures";
import { VariantProfileHeader } from "../../../POM/objects/components/VariantProfileHeader/variantProfileHeader";
import { VariantPage } from "../../../POM/page/variant/variant";

test.describe("Variant Profile Header", () => {
  let variantPage: VariantPage;
  let variantProfileHeader: VariantProfileHeader;

  test.beforeEach(async ({ page, testConfig }) => {
    variantPage = new VariantPage(page);
    variantProfileHeader = new VariantProfileHeader(page);

    // Navigate to a variant page with known data
    await variantPage.goToVariantPage(testConfig.variant.primary);
  });

  test("Profile header is visible", { tag: "@smoke" }, async () => {
    expect(await variantProfileHeader.isProfileHeaderVisible()).toBe(true);
  });

  test("Variant description is displayed", async () => {
    const description = await variantProfileHeader.getVariantDescription();

    expect(description).not.toBeNull();
    expect(description).not.toBe("");
  });

  test("GRCh38 location is displayed", async () => {
    expect(await variantProfileHeader.isGRCh38LocationVisible()).toBe(true);

    const location = await variantProfileHeader.getGRCh38Location();

    // Should contain chromosome and position
    expect(location).toContain("1");
    expect(location).toContain("154453788");
  });

  test("Reference allele is displayed", async () => {
    expect(await variantProfileHeader.isReferenceAlleleVisible()).toBe(true);

    const refAllele = await variantProfileHeader.getReferenceAllele();

    expect(refAllele).not.toBeNull();
    expect(refAllele).toContain("C");
  });

  test("Alternative allele is displayed", async () => {
    expect(await variantProfileHeader.isAlternativeAlleleVisible()).toBe(true);

    const altAllele = await variantProfileHeader.getAlternativeAllele();

    expect(altAllele).not.toBeNull();
    expect(altAllele).toContain("T");
  });

  test("Most severe consequence is displayed", async () => {
    expect(await variantProfileHeader.isMostSevereConsequenceVisible()).toBe(true);

    const consequence = await variantProfileHeader.getMostSevereConsequence();

    expect(consequence).not.toBeNull();
    expect(consequence).not.toBe("");
  });

  test("Can click most severe consequence link", async ({ page }) => {
    const initialUrl = page.url();

    await variantProfileHeader.clickMostSevereConsequenceLink();

    // Wait for navigation
    await page.waitForURL((url) => url.toString() !== initialUrl, { timeout: 5000 });

    // Check that navigation occurred and URL is valid
    const url = page.url();
    expect(url).not.toBe(initialUrl);
    expect(url).toMatch(/^https?:\/\/.+/); // Valid HTTP/HTTPS URL
  });

  test("Allele frequencies section displays when available", async () => {
    const hasFrequencies = await variantProfileHeader.hasAlleleFrequencies();

    if (hasFrequencies) {
      const barCount = await variantProfileHeader.getAlleleFrequencyBars();
      expect(barCount).toBeGreaterThan(0);
    }
  });
});
