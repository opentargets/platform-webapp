import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Safety section on Target page
 * Displays known safety liabilities with effects and biosamples
 * Uses only data-testid selectors for reliable, predictable testing
 */
export class SafetySection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-safety']");
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
    return this.page.locator("[data-testid='section-safety-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Section description
  getSectionDescription(): Locator {
    return this.getSection().locator("[data-testid='section-description']");
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

  getTableBody(): Locator {
    return this.getTable().locator("tbody");
  }

  getTableRows(): Locator {
    return this.getTableBody().locator("tr");
  }

  async getTableRowCount(): Promise<number> {
    return await this.getTableRows().count();
  }

  getTableRow(index: number): Locator {
    return this.getTableRows().nth(index);
  }

  // Safety event link (disease link in first column)
  getSafetyEventLink(rowIndex: number): Locator {
    return this.getTableRow(rowIndex).locator("td").first().locator("a");
  }

  async hasSafetyEventLink(rowIndex: number): Promise<boolean> {
    return await this.getSafetyEventLink(rowIndex)
      .isVisible()
      .catch(() => false);
  }

  async clickSafetyEventLink(rowIndex: number): Promise<void> {
    await this.getSafetyEventLink(rowIndex).click();
  }

  async getSafetyEventName(rowIndex: number): Promise<string | null> {
    return await this.getTableRow(rowIndex).locator("td").first().textContent();
  }

  // Biosystems drawer (TableDrawer component)
  getBiosystemsDrawer(rowIndex: number): Locator {
    return this.getTableRow(rowIndex).locator("[data-testid='table-drawer']");
  }

  async hasBiosystemsDrawer(rowIndex: number): Promise<boolean> {
    return await this.getBiosystemsDrawer(rowIndex)
      .isVisible()
      .catch(() => false);
  }

  async clickBiosystemsDrawer(rowIndex: number): Promise<void> {
    await this.getBiosystemsDrawer(rowIndex).click();
  }

  // Studies drawer (SafetyStudiesDrawer component)
  getStudiesDrawer(rowIndex: number): Locator {
    return this.getTableRow(rowIndex).locator("[data-testid='safety-studies-drawer']");
  }

  async hasStudiesDrawer(rowIndex: number): Promise<boolean> {
    return await this.getStudiesDrawer(rowIndex)
      .isVisible()
      .catch(() => false);
  }

  async clickStudiesDrawer(rowIndex: number): Promise<void> {
    await this.getStudiesDrawer(rowIndex).click();
  }

  // Publications drawer
  getPublicationsDrawer(rowIndex: number): Locator {
    return this.getTableRow(rowIndex).locator("[data-testid='publications-drawer']");
  }

  async hasPublicationsDrawer(rowIndex: number): Promise<boolean> {
    return await this.getPublicationsDrawer(rowIndex)
      .isVisible()
      .catch(() => false);
  }

  async clickPublicationsDrawer(rowIndex: number): Promise<void> {
    await this.getPublicationsDrawer(rowIndex).click();
  }

  // Table search
  getSearchInput(): Locator {
    return this.getSection().locator("[data-testid='table-search-input']");
  }

  async search(searchTerm: string): Promise<void> {
    await this.getSearchInput().fill(searchTerm);
    await this.waitForLoad();
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
