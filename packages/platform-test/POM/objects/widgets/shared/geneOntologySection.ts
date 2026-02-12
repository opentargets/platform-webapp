import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Gene Ontology (GO) section on Target pages.
 *
 * Displays functional annotations from the Gene Ontology Consortium, organized
 * by three aspects:
 * - **Molecular Function (MF)**: Activities at the molecular level (e.g., kinase activity)
 * - **Biological Process (BP)**: Larger biological programs (e.g., cell division)
 * - **Cellular Component (CC)**: Locations within the cell (e.g., nucleus)
 *
 * Each annotation includes evidence codes and links to supporting publications.
 *
 * @example
 * ```typescript
 * const geneOntology = new GeneOntologySection(page);
 * await geneOntology.waitForLoad();
 *
 * // Search GO terms
 * await geneOntology.search("kinase");
 *
 * // Access publications
 * await geneOntology.clickPublicationsDrawer();
 *
 * // Download data
 * await geneOntology.clickDataDownloader();
 * ```
 *
 * @category shared
 * @remarks Section ID: `geneontology`
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
    await this.getSection().waitFor({ state: "visible", timeout: 10000 });
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
