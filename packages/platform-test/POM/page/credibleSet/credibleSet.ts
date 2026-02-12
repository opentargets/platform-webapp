import type { Locator, Page } from "@playwright/test";

export class CredibleSetPage {
  page: Page;
  originalURL: string;
  CREDIBLE_SET_BASE_URL = "/credible-set/";

  constructor(page: Page) {
    this.page = page;
    this.originalURL = page.url();
  }

  /**
   * Navigate directly to a credible set page
   * @param studyLocusId - The study locus ID to navigate to
   */
  async goToCredibleSetPage(studyLocusId: string): Promise<void> {
    await this.page.goto(`${this.CREDIBLE_SET_BASE_URL}${studyLocusId}`);
    await this.waitForCredibleSetPageLoad();
  }

  /**
   * Navigate to a credible set page from a table link
   * @param studyLocusId - The study locus ID to navigate to
   */
  async goToCredibleSetPageFromTable(studyLocusId: string): Promise<void> {
    const link = this.page
      .locator(`a[href*="${this.CREDIBLE_SET_BASE_URL}${studyLocusId}"]`)
      .first();
    await link.click();
    await this.waitForCredibleSetPageLoad();
  }

  /**
   * Wait for the credible set page to load
   */
  async waitForCredibleSetPageLoad(): Promise<void> {
    await this.page.waitForLoadState("networkidle");
    // Wait for header to be visible
    await this.page
      .waitForSelector("[data-testid='profile-page-header-block']", {
        state: "visible",
        timeout: 10000,
      })
      .catch(() => {
        // Fallback if test-id not present
      });
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if we're on a credible set page
   */
  async isCredibleSetPage(): Promise<boolean> {
    const url = this.page.url();
    return url.includes("/credible-set/");
  }

  // Header elements
  getHeader(): Locator {
    return this.page.locator("[data-testid='profile-page-header-block']");
  }

  async isHeaderVisible(): Promise<boolean> {
    return await this.getHeader()
      .isVisible()
      .catch(() => false);
  }

  getPageTitle(): Locator {
    return this.page.locator("[data-testid='profile-page-header-text']");
  }

  async getPageTitleText(): Promise<string | null> {
    return await this.getPageTitle().textContent();
  }

  // External links in header
  getLeadVariantLink(): Locator {
    return this.page.locator("a[href*='/variant/']").first();
  }

  async clickLeadVariantLink(): Promise<void> {
    await this.getLeadVariantLink().click();
  }

  async getLeadVariantId(): Promise<string | null> {
    const link = this.getLeadVariantLink();
    return await link.textContent();
  }

  getStudyLink(): Locator {
    return this.page.locator("a[href*='/study/']").first();
  }

  async clickStudyLink(): Promise<void> {
    await this.getStudyLink().click();
  }

  async getStudyId(): Promise<string | null> {
    const link = this.getStudyLink();
    return await link.textContent();
  }

  // Tab navigation
  getProfileTab(): Locator {
    return this.page.locator(`a[href*="${this.CREDIBLE_SET_BASE_URL}"][role="tab"]`).first();
  }

  async isProfileTabActive(): Promise<boolean> {
    const tab = this.getProfileTab();
    const ariaSelected = await tab.getAttribute("aria-selected");
    return ariaSelected === "true";
  }

  async clickProfileTab(): Promise<void> {
    await this.getProfileTab().click();
  }

  /**
   * Wait for a specific section to finish loading
   * @param sectionTestId - The test-id of the section
   */
  async waitForSectionToLoad(sectionTestId: string): Promise<void> {
    const section = this.page.locator(`[data-testid='${sectionTestId}']`);

    // Wait for section to be visible
    await section.waitFor({ state: "visible", timeout: 10000 });

    // Wait for skeleton loaders to disappear
    await this.page
      .waitForFunction(
        (testId) => {
          const sect = document.querySelector(`[data-testid='${testId}']`);
          if (!sect) return false;
          const skeletons = sect.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        sectionTestId,
        { timeout: 15000 }
      )
      .catch(() => {
        // If no skeletons found, section already loaded
      });
  }
}
