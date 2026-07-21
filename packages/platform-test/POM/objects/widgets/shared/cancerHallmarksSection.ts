import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Cancer Hallmarks section on Target page
 * Displays cancer hallmarks with role in cancer chips and a table of hallmark effects
 * Uses only data-testid selectors for reliable, predictable testing
 */
export class CancerHallmarksSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-cancerhallmarks']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for the section to be visible
   */
  async waitForLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible", timeout: 20000 });
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-cancerhallmarks-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Section description
  getSectionDescription(): Locator {
    return this.getSection().locator("[data-testid='section-description']");
  }

  // Role in cancer section
  getRoleInCancerSection(): Locator {
    return this.getSection().locator("[data-testid='role-in-cancer']");
  }

  // Role in cancer chips (by index)
  getRoleInCancerChip(index: number): Locator {
    return this.getRoleInCancerSection().locator(`[data-testid='chip-item-${index}']`);
  }

  async getRoleInCancerChipLabel(index: number): Promise<string | null> {
    return await this.getRoleInCancerChip(index).textContent();
  }

  async clickRoleInCancerChip(index: number): Promise<void> {
    await this.getRoleInCancerChip(index).click();
  }

  // Table
  getTable(): Locator {
    return this.getSection().locator("[data-testid='ot-table']");
  }

  async isTableVisible(): Promise<boolean> {
    return await this.getTable()
      .isVisible()
      .catch(() => false);
  }

  // Table search
  getSearchInput(): Locator {
    return this.getSection().locator("[data-testid='table-search-input']");
  }

  async search(searchTerm: string): Promise<void> {
    await this.getSearchInput().fill(searchTerm);
    await this.waitForLoad();
  }

  // Publications drawer
  getPublicationsDrawer(): Locator {
    return this.getSection().locator("[data-testid='publications-drawer']");
  }

  async clickPublicationsDrawer(): Promise<void> {
    await this.getPublicationsDrawer().first().click();
  }

  // Data downloader
  getDataDownloader(): Locator {
    return this.getSection().locator("[data-testid='data-downloader']");
  }

  async clickDataDownloader(): Promise<void> {
    await this.getDataDownloader().click();
  }

  // Pagination controls
  getPaginationFirstButton(): Locator {
    return this.getSection().locator("[data-testid='pagination-first-button']");
  }

  getPaginationPreviousButton(): Locator {
    return this.getSection().locator("[data-testid='pagination-previous-button']");
  }

  getPaginationNextButton(): Locator {
    return this.getSection().locator("[data-testid='pagination-next-button']");
  }

  getPaginationLastButton(): Locator {
    return this.getSection().locator("[data-testid='pagination-last-button']");
  }

  async goToFirstPage(): Promise<void> {
    await this.getPaginationFirstButton().click();
  }

  async goToPreviousPage(): Promise<void> {
    await this.getPaginationPreviousButton().click();
  }

  async goToNextPage(): Promise<void> {
    await this.getPaginationNextButton().click();
  }

  async goToLastPage(): Promise<void> {
    await this.getPaginationLastButton().click();
  }
}
