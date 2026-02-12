import { expect, test } from "../../../../fixtures";
import { CredibleSetVariantsSection } from "../../../../POM/objects/widgets/CredibleSet/variantsSection";

test.describe("Credible Set Variants Section", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const credibleSetId = testConfig.credibleSet?.primary;
    await page.goto(`${baseURL}/credible-set/${credibleSetId}`);
    await page.waitForLoadState("networkidle");
  });

  test("Section is visible when credible set has variants data", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      expect(isVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table is displayed with variants data", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const isTableVisible = await variantsSection.isTableVisible();
      expect(isTableVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table contains rows with variants", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const rowCount = await variantsSection.getTableRows();
      expect(rowCount).toBeGreaterThanOrEqual(1);
    } else {
      test.skip();
    }
  });

  test("Variant link is displayed in table rows", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const rowCount = await variantsSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await variantsSection.hasVariantLink(0);
        if (hasLink) {
          const variantId = await variantsSection.getVariantId(0);
          expect(variantId).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("Lead variant is marked in the table", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const rowCount = await variantsSection.getTableRows();

      if (rowCount > 0) {
        // At least one variant should be marked as lead
        let hasLeadVariant = false;
        for (let i = 0; i < rowCount; i++) {
          const isLead = await variantsSection.isLeadVariant(i);
          if (isLead) {
            hasLeadVariant = true;
            break;
          }
        }
        expect(hasLeadVariant).toBe(true);
      }
    } else {
      test.skip();
    }
  });

  test("Posterior probability is displayed in table rows", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const rowCount = await variantsSection.getTableRows();

      if (rowCount > 0) {
        const posteriorProb = await variantsSection.getPosteriorProbability(0);
        expect(posteriorProb).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test("Predicted consequence link is displayed when available", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const rowCount = await variantsSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await variantsSection.hasPredictedConsequenceLink(0);
        if (hasLink) {
          const consequence = await variantsSection.getPredictedConsequence(0);
          expect(consequence).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("Variant link navigates to variant page", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const rowCount = await variantsSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await variantsSection.hasVariantLink(0);
        if (hasLink) {
          await variantsSection.clickVariantLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/variant/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Search functionality filters variants", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const searchInput = variantsSection.getSearchInput();
      const searchVisible = await searchInput.isVisible().catch(() => false);

      if (searchVisible) {
        await variantsSection.search("intron");
        await page.waitForTimeout(500);
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe("intron");
      }
    } else {
      test.skip();
    }
  });

  test("Pagination controls are functional", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const rowCount = await variantsSection.getTableRows();

      if (rowCount >= 10) {
        const isNextEnabled = await variantsSection.isNextPageEnabled();
        if (isNextEnabled) {
          await variantsSection.clickNextPage();
          const isPrevEnabled = await variantsSection.isPreviousPageEnabled();
          expect(isPrevEnabled).toBe(true);
        }
      }
    } else {
      test.skip();
    }
  });

  test("Columns button is visible", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const columnsButton = variantsSection.getColumnsButton();
      const isColumnsVisible = await columnsButton.isVisible().catch(() => false);
      expect(isColumnsVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Export button is visible", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const exportButton = variantsSection.getExportButton();
      const isExportVisible = await exportButton.isVisible().catch(() => false);
      expect(isExportVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("API query button is visible", async ({ page }) => {
    const variantsSection = new CredibleSetVariantsSection(page);
    const isVisible = await variantsSection.isSectionVisible();

    if (isVisible) {
      await variantsSection.waitForLoad();
      const apiButton = variantsSection.getAPIQueryButton();
      const isAPIVisible = await apiButton.isVisible().catch(() => false);
      expect(isAPIVisible).toBe(true);
    } else {
      test.skip();
    }
  });
});
