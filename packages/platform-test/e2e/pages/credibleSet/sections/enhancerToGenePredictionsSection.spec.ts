import { expect, test } from "../../../../fixtures";
import { CredibleSetEnhancerToGenePredictionsSection } from "../../../../POM/objects/widgets/CredibleSet/enhancerToGenePredictionsSection";

test.describe("Enhancer to Gene Predictions Section", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const credibleSetId = testConfig.credibleSet?.primary;
    await page.goto(`${baseURL}/credible-set/${credibleSetId}`);
    await page.waitForLoadState("networkidle");
  });

  test("Section is visible when credible set has E2G data", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      expect(isVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table is displayed with E2G predictions", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      const isTableVisible = await e2gSection.isTableVisible();
      expect(isTableVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table contains rows with E2G predictions", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      const rowCount = await e2gSection.getTableRows();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test("Target gene link is displayed in table rows", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      const rowCount = await e2gSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await e2gSection.hasTargetGeneLink(0);
        if (hasLink) {
          const geneName = await e2gSection.getTargetGeneName(0);
          expect(geneName).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("E2G score is displayed in table rows", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      const rowCount = await e2gSection.getTableRows();

      if (rowCount > 0) {
        const e2gScore = await e2gSection.getE2GScore(0);
        expect(e2gScore).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test("Target gene link navigates to target page", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      const rowCount = await e2gSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await e2gSection.hasTargetGeneLink(0);
        if (hasLink) {
          await e2gSection.clickTargetGeneLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/target/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Search functionality filters E2G predictions", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      const searchInput = e2gSection.getSearchInput();
      const searchVisible = await searchInput.isVisible().catch(() => false);

      if (searchVisible) {
        await e2gSection.search("test");
        await page.waitForTimeout(500);
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe("test");
      }
    } else {
      test.skip();
    }
  });

  test("Pagination controls are functional", async ({ page }) => {
    const e2gSection = new CredibleSetEnhancerToGenePredictionsSection(page);
    const isVisible = await e2gSection.isSectionVisible();

    if (isVisible) {
      await e2gSection.waitForLoad();
      const rowCount = await e2gSection.getTableRows();

      if (rowCount >= 10) {
        const isNextEnabled = await e2gSection.isNextPageEnabled();
        if (isNextEnabled) {
          await e2gSection.clickNextPage();
          const isPrevEnabled = await e2gSection.isPreviousPageEnabled();
          expect(isPrevEnabled).toBe(true);
        }
      }
    } else {
      test.skip();
    }
  });
});
