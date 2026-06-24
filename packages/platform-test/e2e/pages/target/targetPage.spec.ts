import { expect, test } from "../../../fixtures";
import { TargetPage } from "../../../POM/page/target/target";

test.describe("Target Page - Header and Navigation", () => {
  test.beforeEach(async ({ page, baseURL, testConfig }) => {
    const targetId = testConfig.target?.primary || "ENSG00000157764";
    await page.goto(`${baseURL}/target/${targetId}`);
  });

  test.describe("Page Header", () => {
    test("Target page loads successfully with correct title and name", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const isLoaded = await targetPage.isPageLoaded();
      expect(isLoaded).toBe(true);

      const symbolText = await targetPage.getTargetSymbolText();
      expect(symbolText).toBeTruthy();
      expect(symbolText?.trim().length).toBeGreaterThan(0);

      const nameText = await targetPage.getTargetNameText();
      expect(nameText).toBeTruthy();
      expect(nameText?.trim().length).toBeGreaterThan(0);
    });
  });

  test.describe("External Links", () => {
    test("Ensembl link is present and correct", async ({ page, testConfig }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const ensemblLink = targetPage.getEnsemblLink();
      await expect(ensemblLink).toBeVisible();

      const href = await targetPage.getEnsemblLinkHref();
      const targetId = testConfig.target?.primary || "ENSG00000157764";
      expect(href).toContain("identifiers.org/ensembl");
      expect(href).toContain(targetId);
    });

    test("UniProt links are present when protein IDs exist", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const uniprotLinksCount = await targetPage.getUniProtLinksCount();
      expect(uniprotLinksCount).toBeGreaterThanOrEqual(1);

      if (uniprotLinksCount > 0) {
        const firstHref = await targetPage.getFirstUniProtLinkHref();
        expect(firstHref).toContain("identifiers.org/uniprot");
      }
    });

    test("GeneCards link is present and correct", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const geneCardsLink = targetPage.getGeneCardsLink();
      await expect(geneCardsLink).toBeVisible();

      const href = await targetPage.getGeneCardsLinkHref();
      expect(href).toContain("identifiers.org/genecards");
    });

    test("HGNC link is present and correct", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const hgncLink = targetPage.getHGNCLink();
      await expect(hgncLink).toBeVisible();

      const href = await targetPage.getHGNCLinkHref();
      expect(href).toContain("identifiers.org/hgnc.symbol");
    });

    test("External links section has multiple links", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const linksCount = await targetPage.getExternalLinksCount();
      // At minimum: Ensembl, UniProt, GeneCards, HGNC
      expect(linksCount).toBeGreaterThanOrEqual(4);
    });

    test("TEP link is present when target has TEP data", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      // This link may not always be present, so we check conditionally
      const tepHref = await targetPage.getTEPLinkHref();
      if (tepHref) {
        expect(tepHref).toContain("thesgc.org/tep");
      }
    });
  });

  test.describe("Tab Navigation", () => {
    test("Both Profile and Associated diseases tabs are visible", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const profileTab = targetPage.getProfileTab();
      await expect(profileTab).toBeVisible();

      const associationsTab = targetPage.getAssociationsTab();
      await expect(associationsTab).toBeVisible();
    });

    test("Profile tab is active by default", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const isActive = await targetPage.isProfileTabActive();
      expect(isActive).toBe(true);
    });

    test("Can navigate to Associated diseases tab", async ({ page, testConfig }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      await targetPage.clickAssociationsTab();

      const isActive = await targetPage.isAssociationsTabActive();
      expect(isActive).toBe(true);

      const targetId = testConfig.target?.primary || "ENSG00000157764";
      await expect(page).toHaveURL(new RegExp(`/target/${targetId}/associations`));
    });

    test("Can navigate back to Profile tab from Associated diseases", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      // Navigate to associations
      await targetPage.clickAssociationsTab();
      await page.waitForTimeout(500);

      // Navigate back to profile
      await targetPage.clickProfileTab();

      const isActive = await targetPage.isProfileTabActive();
      expect(isActive).toBe(true);
    });

    test("URL changes when switching between tabs", async ({ page, testConfig }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const targetId = testConfig.target?.primary || "ENSG00000157764";

      // Check profile URL
      await expect(page).toHaveURL(new RegExp(`/target/${targetId}$`));

      // Switch to associations
      await targetPage.clickAssociationsTab();
      await expect(page).toHaveURL(new RegExp(`/target/${targetId}/associations`));

      // Switch back to profile
      await targetPage.clickProfileTab();
      await expect(page).toHaveURL(new RegExp(`/target/${targetId}$`));
    });
  });

  test.describe("Direct Navigation", () => {
    test("Can navigate directly to profile page", async ({ page, testConfig }) => {
      const targetId = testConfig.target?.primary || "ENSG00000157764";
      const targetPage = new TargetPage(page);

      await targetPage.goToTargetPage(targetId);
      await targetPage.waitForPageLoad();

      const isLoaded = await targetPage.isPageLoaded();
      expect(isLoaded).toBe(true);

      const isActive = await targetPage.isProfileTabActive();
      expect(isActive).toBe(true);
    });

    test("Can navigate directly to associations page", async ({ page, baseURL, testConfig }) => {
      const targetId = testConfig.target?.primary || "ENSG00000157764";
      await page.goto(`${baseURL}/target/${targetId}/associations`);

      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const isActive = await targetPage.isAssociationsTabActive();
      expect(isActive).toBe(true);
    });
  });

  test.describe("Page Title and Meta", () => {
    test("Profile page has correct title", async ({ page }) => {
      const targetPage = new TargetPage(page);
      await targetPage.waitForPageLoad();

      const title = await page.title();
      expect(title).toContain("profile page");
    });

    test("Associations page has correct title", async ({ page, baseURL, testConfig }) => {
      const targetId = testConfig.target?.primary || "ENSG00000157764";
      await page.goto(`${baseURL}/target/${targetId}/associations`);

      const title = await page.title();
      expect(title).toContain("Diseases associated with");
    });
  });
});
