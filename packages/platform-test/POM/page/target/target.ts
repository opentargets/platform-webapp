import type { Locator, Page } from "@playwright/test";

/**
 * Target Page Object Model
 * Handles navigation and interactions on the Target page
 */
export class TargetPage {
  page: Page;
  originalURL: string;

  constructor(page: Page) {
    this.page = page;
    this.originalURL = page.url();
  }

  /**
   * Navigate to a target page by Ensembl ID
   * @param ensgId - Ensembl gene ID (e.g., "ENSG00000157764")
   */
  async goToTargetPage(ensgId: string): Promise<void> {
    await this.page.goto(`/target/${ensgId}`);
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Get the URL for the profile page (removes /associations if present)
   */
  getProfilePageUrl(): string {
    return this.originalURL.replace(/\/associations$/, "");
  }

  /**
   * Navigate to the profile tab
   */
  async goToProfilePage(): Promise<void> {
    await this.page.goto(this.getProfilePageUrl());
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Navigate to the associations tab
   */
  async goToAssociationsPage(): Promise<void> {
    const baseUrl = this.getProfilePageUrl();
    await this.page.goto(`${baseUrl}/associations`);
    await this.page.waitForLoadState("networkidle");
  }

  // Tab navigation
  /**
   * Get the Profile tab element
   */
  getProfileTab(): Locator {
    return this.page.locator("[role='tab']").filter({ hasText: /profile/i });
  }

  /**
   * Get the Associated diseases tab element
   */
  getAssociationsTab(): Locator {
    return this.page.locator("[role='tab']").filter({ hasText: /associated diseases/i });
  }

  /**
   * Click on the Profile tab
   */
  async clickProfileTab(): Promise<void> {
    await this.getProfileTab().click();
    await this.page.waitForURL(/\/target\/[^/]+$/);
  }

  /**
   * Click on the Associated diseases tab
   */
  async clickAssociationsTab(): Promise<void> {
    await this.getAssociationsTab().click();
    await this.page.waitForURL(/\/target\/[^/]+\/associations/);
  }

  /**
   * Check if Profile tab is active
   */
  async isProfileTabActive(): Promise<boolean> {
    const tab = this.getProfileTab();
    const isSelected = await tab.getAttribute("aria-selected");
    return isSelected === "true";
  }

  /**
   * Check if Associations tab is active
   */
  async isAssociationsTabActive(): Promise<boolean> {
    const tab = this.getAssociationsTab();
    const isSelected = await tab.getAttribute("aria-selected");
    return isSelected === "true";
  }

  // External links in header
  /**
   * Get the Ensembl external link
   */
  getEnsemblLink(): Locator {
    return this.page.locator('a[href*="identifiers.org/ensembl"]');
  }

  /**
   * Get the Ensembl link href attribute
   */
  async getEnsemblLinkHref(): Promise<string | null> {
    return await this.getEnsemblLink().getAttribute("href");
  }

  /**
   * Get all UniProt external links
   */
  getUniProtLinks(): Locator {
    return this.page.locator('a[href*="identifiers.org/uniprot"]');
  }

  /**
   * Get the count of UniProt links
   */
  async getUniProtLinksCount(): Promise<number> {
    return await this.getUniProtLinks().count();
  }

  /**
   * Get the first UniProt link href attribute
   */
  async getFirstUniProtLinkHref(): Promise<string | null> {
    return await this.getUniProtLinks().first().getAttribute("href");
  }

  /**
   * Get the GeneCards external link
   */
  getGeneCardsLink(): Locator {
    return this.page.locator('a[href*="identifiers.org/genecards"]');
  }

  /**
   * Get the GeneCards link href attribute
   */
  async getGeneCardsLinkHref(): Promise<string | null> {
    return await this.getGeneCardsLink().getAttribute("href");
  }

  /**
   * Get the HGNC external link
   */
  getHGNCLink(): Locator {
    return this.page.locator('a[href*="identifiers.org/hgnc.symbol"]');
  }

  /**
   * Get the HGNC link href attribute
   */
  async getHGNCLinkHref(): Promise<string | null> {
    return await this.getHGNCLink().getAttribute("href");
  }

  /**
   * Get the TEP (Target Enabling Package) link
   */
  getTEPLink(): Locator {
    return this.page.locator('a[href*="thesgc.org/tep"]');
  }

  /**
   * Get the TEP link href attribute (if available)
   */
  async getTEPLinkHref(): Promise<string | null> {
    const isVisible = await this.getTEPLink()
      .isVisible()
      .catch(() => false);
    if (!isVisible) return null;
    return await this.getTEPLink().getAttribute("href");
  }

  /**
   * Get all external links in the header
   */
  getExternalLinks(): Locator {
    return this.page.locator("[data-testid='external-links'] a");
  }

  /**
   * Get the count of all external links
   */
  async getExternalLinksCount(): Promise<number> {
    return await this.getExternalLinks().count();
  }

  // Page header elements
  /**
   * Get the target symbol (main title) in the header
   */
  getTargetSymbol(): Locator {
    return this.page.locator("[data-testid='profile-page-header-text']");
  }

  /**
   * Get the target symbol text
   */
  async getTargetSymbolText(): Promise<string | null> {
    return await this.getTargetSymbol().textContent();
  }

  /**
   * Get the target name (subtitle) in the header
   */
  getTargetName(): Locator {
    return this.page.locator("[data-testid='profile-page-header-block'] h5");
  }

  /**
   * Get the target name text
   */
  async getTargetNameText(): Promise<string | null> {
    return await this.getTargetName().textContent();
  }

  /**
   * Wait for the target page to load completely
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForSelector("[data-testid='profile-page-header-text']", {
      state: "visible",
    });
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Check if the page has loaded (header is visible)
   */
  async isPageLoaded(): Promise<boolean> {
    return await this.getTargetSymbol()
      .isVisible()
      .catch(() => false);
  }
}
