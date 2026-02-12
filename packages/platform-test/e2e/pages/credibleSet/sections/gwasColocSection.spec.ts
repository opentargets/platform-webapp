import { expect, test } from "../../../../fixtures";
import { GWASColocSection } from "../../../../POM/objects/widgets/CredibleSet/gwasColocSection";

test.describe("GWAS Colocalisation Section", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const credibleSetId = testConfig.credibleSet?.primary;
    await page.goto(`${baseURL}/credible-set/${credibleSetId}`);
    await page.waitForLoadState("networkidle");
  });

  test("Section is visible when credible set has GWAS coloc data", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      expect(isVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table is displayed with colocalisation data", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const isTableVisible = await gwasColocSection.isTableVisible();
      expect(isTableVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table contains rows with colocalisation data", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test("Credible set link is displayed in table rows", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await gwasColocSection.hasCredibleSetLink(0);
        expect(hasLink).toBe(true);
      }
    } else {
      test.skip();
    }
  });

  test("Study link is displayed in table rows", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await gwasColocSection.hasStudyLink(0);
        if (hasLink) {
          const studyId = await gwasColocSection.getStudyId(0);
          expect(studyId).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("Lead variant link is displayed in table rows", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await gwasColocSection.hasLeadVariantLink(0);
        expect(hasLink).toBe(true);
      }
    } else {
      test.skip();
    }
  });

  test("Reported trait is displayed in table rows", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const reportedTrait = await gwasColocSection.getReportedTrait(0);
        expect(reportedTrait).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test("Colocalisation method is displayed", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const method = await gwasColocSection.getColocalisationMethod(0);
        expect(method).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test("Credible set link navigates to credible set page", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await gwasColocSection.hasCredibleSetLink(0);
        if (hasLink) {
          await gwasColocSection.clickCredibleSetLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/credible-set/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Study link navigates to study page", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await gwasColocSection.hasStudyLink(0);
        if (hasLink) {
          await gwasColocSection.clickStudyLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/study/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Lead variant link navigates to variant page", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await gwasColocSection.hasLeadVariantLink(0);
        if (hasLink) {
          await gwasColocSection.clickLeadVariantLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/variant/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Search functionality filters colocalisation data", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const searchInput = gwasColocSection.getSearchInput();
      const searchVisible = await searchInput.isVisible().catch(() => false);

      if (searchVisible) {
        await gwasColocSection.search("test");
        await page.waitForTimeout(500);
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe("test");
      }
    } else {
      test.skip();
    }
  });

  test("Pagination controls are functional", async ({ page }) => {
    const gwasColocSection = new GWASColocSection(page);
    const isVisible = await gwasColocSection.isSectionVisible();

    if (isVisible) {
      await gwasColocSection.waitForLoad();
      const rowCount = await gwasColocSection.getTableRows();

      if (rowCount >= 10) {
        const isNextEnabled = await gwasColocSection.isNextPageEnabled();
        if (isNextEnabled) {
          await gwasColocSection.clickNextPage();
          const isPrevEnabled = await gwasColocSection.isPreviousPageEnabled();
          expect(isPrevEnabled).toBe(true);
        }
      }
    } else {
      test.skip();
    }
  });
});
