import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * Interactor for Gene Ontology section on Target page
 * Displays GO annotations organized by aspect (Molecular Function, Biological Process, Cellular Component)
 * Uses only data-testid selectors for reliable, predictable testing
 */
export class GeneOntologySection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-geneontology']");
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
    await this.getSection().waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-geneontology-header']");
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
