import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Molecular Interactions section on Target pages.
 *
 * Displays protein-protein interactions (PPIs) from multiple curated databases,
 * organized in tabs by data source:
 * - **IntAct**: Experimentally validated physical interactions
 * - **Signor**: Causal signaling relationships
 * - **Reactome**: Pathway-based functional interactions
 * - **String**: Predicted and experimental interaction networks
 *
 * Each interaction includes confidence scores, interaction types, and literature evidence.
 *
 * @example
 * ```typescript
 * const interactions = new MolecularInteractionsSection(page);
 * await interactions.waitForLoad();
 *
 * // Switch between data sources
 * await interactions.clickIntactTab();
 * await interactions.clickSignorTab();
 *
 * // Search interactions
 * await interactions.search("MAPK");
 *
 * // Download data
 * await interactions.clickDataDownloader();
 * ```
 *
 * @category shared
 * @remarks Section ID: `interactions`
 */
export class MolecularInteractionsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-interactions']");
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
    await this.getSection().waitFor({ state: "visible", timeout: 10000 });
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-interactions-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Section description
  getSectionDescription(): Locator {
    return this.getSection().locator("[data-testid='section-description']");
  }

  // Tabs container
  getTabs(): Locator {
    return this.getSection().locator("[data-testid='interactions-tabs']");
  }

  // Individual tabs
  getIntactTab(): Locator {
    return this.getSection().locator("[data-testid='interactions-tab-intact']");
  }

  getSignorTab(): Locator {
    return this.getSection().locator("[data-testid='interactions-tab-signor']");
  }

  getReactomeTab(): Locator {
    return this.getSection().locator("[data-testid='interactions-tab-reactome']");
  }

  getStringTab(): Locator {
    return this.getSection().locator("[data-testid='interactions-tab-string']");
  }

  async clickIntactTab(): Promise<void> {
    await this.getIntactTab().click();
    await this.waitForLoad();
  }

  async clickSignorTab(): Promise<void> {
    await this.getSignorTab().click();
    await this.waitForLoad();
  }

  async clickReactomeTab(): Promise<void> {
    await this.getReactomeTab().click();
    await this.waitForLoad();
  }

  async clickStringTab(): Promise<void> {
    await this.getStringTab().click();
    await this.waitForLoad();
  }

  // Tab content containers
  getIntactContent(): Locator {
    return this.getSection().locator("[data-testid='interactions-content-intact']");
  }

  getSignorContent(): Locator {
    return this.getSection().locator("[data-testid='interactions-content-signor']");
  }

  getReactomeContent(): Locator {
    return this.getSection().locator("[data-testid='interactions-content-reactome']");
  }

  getStringContent(): Locator {
    return this.getSection().locator("[data-testid='interactions-content-string']");
  }

  async isIntactContentVisible(): Promise<boolean> {
    return await this.getIntactContent()
      .isVisible()
      .catch(() => false);
  }

  async isSignorContentVisible(): Promise<boolean> {
    return await this.getSignorContent()
      .isVisible()
      .catch(() => false);
  }

  async isReactomeContentVisible(): Promise<boolean> {
    return await this.getReactomeContent()
      .isVisible()
      .catch(() => false);
  }

  async isStringContentVisible(): Promise<boolean> {
    return await this.getStringContent()
      .isVisible()
      .catch(() => false);
  }

  // Table (present in most tabs)
  // The Molecular Interactions section uses plain table elements without data-testid
  getTable(): Locator {
    return this.getSection().locator("table").first();
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
