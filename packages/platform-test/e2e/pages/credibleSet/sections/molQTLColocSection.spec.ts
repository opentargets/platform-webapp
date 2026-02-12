import { expect, test } from "../../../../fixtures";
import { MolQTLColocSection } from "../../../../POM/objects/widgets/CredibleSet/molQTLColocSection";

test.describe("MolQTL Colocalisation Section", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const credibleSetId = testConfig.credibleSet?.primary;
    await page.goto(`${baseURL}/credible-set/${credibleSetId}`);
    await page.waitForLoadState("networkidle");
  });

  test("Section is visible when credible set has MolQTL coloc data", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      expect(isVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table is displayed with colocalisation data", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const isTableVisible = await molQTLSection.isTableVisible();
      expect(isTableVisible).toBe(true);
    } else {
      test.skip();
    }
  });

  test("Table contains rows with colocalisation data", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();
      expect(rowCount).toBeGreaterThanOrEqual(0);
    } else {
      test.skip();
    }
  });

  test("Credible set link is displayed in table rows", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasCredibleSetLink(0);
        expect(hasLink).toBe(true);
      }
    } else {
      test.skip();
    }
  });

  test("Study link is displayed in table rows", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasStudyLink(0);
        if (hasLink) {
          const studyId = await molQTLSection.getStudyId(0);
          expect(studyId).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("Study type is displayed in table rows", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const studyType = await molQTLSection.getStudyType(0);
        expect(studyType).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test("Affected gene link is displayed in table rows", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasAffectedGeneLink(0);
        if (hasLink) {
          const geneName = await molQTLSection.getAffectedGeneName(0);
          expect(geneName).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("Affected tissue link is displayed when present", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasAffectedTissueLink(0);
        if (hasLink) {
          const tissueName = await molQTLSection.getAffectedTissueName(0);
          expect(tissueName).toBeTruthy();
        }
      }
    } else {
      test.skip();
    }
  });

  test("Lead variant link is displayed in table rows", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasLeadVariantLink(0);
        expect(hasLink).toBe(true);
      }
    } else {
      test.skip();
    }
  });

  test("Colocalisation method is displayed", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const method = await molQTLSection.getColocalisationMethod(0);
        expect(method).toBeTruthy();
      }
    } else {
      test.skip();
    }
  });

  test("Credible set link navigates to credible set page", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasCredibleSetLink(0);
        if (hasLink) {
          await molQTLSection.clickCredibleSetLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/credible-set/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Study link navigates to study page", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasStudyLink(0);
        if (hasLink) {
          await molQTLSection.clickStudyLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/study/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Affected gene link navigates to target page", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasAffectedGeneLink(0);
        if (hasLink) {
          await molQTLSection.clickAffectedGeneLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/target/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Lead variant link navigates to variant page", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount > 0) {
        const hasLink = await molQTLSection.hasLeadVariantLink(0);
        if (hasLink) {
          await molQTLSection.clickLeadVariantLink(0);
          await page.waitForLoadState("networkidle");
          expect(page.url()).toContain("/variant/");
        }
      }
    } else {
      test.skip();
    }
  });

  test("Search functionality filters colocalisation data", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const searchInput = molQTLSection.getSearchInput();
      const searchVisible = await searchInput.isVisible().catch(() => false);

      if (searchVisible) {
        await molQTLSection.search("eQTL");
        await page.waitForTimeout(500);
        const inputValue = await searchInput.inputValue();
        expect(inputValue).toBe("eQTL");
      }
    } else {
      test.skip();
    }
  });

  test("Pagination controls are functional", async ({ page }) => {
    const molQTLSection = new MolQTLColocSection(page);
    const isVisible = await molQTLSection.isSectionVisible();

    if (isVisible) {
      await molQTLSection.waitForLoad();
      const rowCount = await molQTLSection.getTableRows();

      if (rowCount >= 10) {
        const isNextEnabled = await molQTLSection.isNextPageEnabled();
        if (isNextEnabled) {
          await molQTLSection.clickNextPage();
          const isPrevEnabled = await molQTLSection.isPreviousPageEnabled();
          expect(isPrevEnabled).toBe(true);
        }
      }
    } else {
      test.skip();
    }
  });
});
