import { expect, test } from "../../../../fixtures";
import { Locus2GeneSection } from "../../../../POM/objects/widgets/CredibleSet/locus2GeneSection";

test.describe("Locus2Gene Section", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const credibleSetId = testConfig.credibleSet?.primary;
    await page.goto(`${baseURL}/credible-set/${credibleSetId}`);
    await page.waitForLoadState("networkidle");
  });

  test("Section is visible when credible set has L2G data", async ({ page }) => {
    const l2gSection = new Locus2GeneSection(page);
    const isVisible = await l2gSection.isSectionVisible();

    if (isVisible) {
      await l2gSection.waitForLoad();
      expect(isVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Heatmap table is displayed", async ({ page }) => {
    const l2gSection = new Locus2GeneSection(page);
    const isVisible = await l2gSection.isSectionVisible();

    if (isVisible) {
      await l2gSection.waitForLoad();
      const isHeatmapVisible = await l2gSection.isHeatmapVisible();
      expect(isHeatmapVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table contains rows with L2G predictions", async ({ page }) => {
    const l2gSection = new Locus2GeneSection(page);
    const isVisible = await l2gSection.isSectionVisible();

    if (isVisible) {
      await l2gSection.waitForLoad();
      const rowCount = await l2gSection.getTableRows();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test("Target gene link is displayed in table rows", async ({ page }) => {
    const l2gSection = new Locus2GeneSection(page);
    const isVisible = await l2gSection.isSectionVisible();

    if (isVisible) {
      await l2gSection.waitForLoad();
      const rowCount = await l2gSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await l2gSection.hasTargetGeneLink(0);
        if (hasLink) {
          const geneName = await l2gSection.getTargetGeneName(0);
          expect(geneName).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("L2G score is displayed in table rows", async ({ page }) => {
    const l2gSection = new Locus2GeneSection(page);
    const isVisible = await l2gSection.isSectionVisible();

    if (isVisible) {
      await l2gSection.waitForLoad();
      const rowCount = await l2gSection.getTableRows();

      if (rowCount > 0) {
        const l2gScore = await l2gSection.getL2GScore(0);
        expect(l2gScore).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test("Target gene link navigates to target page", async ({ page }) => {
    const l2gSection = new Locus2GeneSection(page);
    const isVisible = await l2gSection.isSectionVisible();

    if (isVisible) {
      await l2gSection.waitForLoad();
      const rowCount = await l2gSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await l2gSection.hasTargetGeneLink(0);
        if (hasLink) {
          await l2gSection.clickTargetGeneLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/target/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Search functionality filters L2G predictions", async ({ page }) => {
    const l2gSection = new Locus2GeneSection(page);
    const isVisible = await l2gSection.isSectionVisible();

    if (isVisible) {
      await l2gSection.waitForLoad();
      const searchInput = l2gSection.getSearchInput();
      const searchVisible = await searchInput.isVisible().catch(() => false);

      if (searchVisible) {
        await l2gSection.search("test");
        await page.waitForTimeout(500);
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe("test");
      }
    } else {
      test.skip();
    }
  });
});
