import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Comparative Genomics section on Target pages.
 *
 * Displays evolutionary conservation data showing homologous genes across species.
 * Data is sourced from Ensembl Compara and includes:
 * - **Orthologues**: Genes in other species that evolved from a common ancestor
 * - **Paralogues**: Genes within the same species arising from gene duplication
 * - **Homology types**: One-to-one, one-to-many, many-to-many relationships
 * - **Sequence identity**: Percentage similarity between protein sequences
 *
 * The section supports two visualization modes:
 * - **Chart view**: Phylogenetic tree visualization of homologues
 * - **Table view**: Detailed tabular data with search and pagination
 *
 * @example
 * ```typescript
 * const compGenomics = new ComparativeGenomicsSection(page);
 * await compGenomics.waitForLoad();
 *
 * // Switch between views
 * await compGenomics.switchToChartView();
 * const chartVisible = await compGenomics.isChartVisible();
 *
 * await compGenomics.switchToTableView();
 * await compGenomics.search("mouse");
 *
 * // Download data
 * await compGenomics.clickDataDownloader();
 * ```
 *
 * @category shared
 * @remarks Section ID: `compgenomics`
 */
export class ComparativeGenomicsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-compgenomics']");
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
    return this.page.locator("[data-testid='section-compgenomics-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Section description
  getSectionDescription(): Locator {
    return this.getSection().locator("[data-testid='section-description']");
  }

  // View toggle buttons
  getChartViewButton(): Locator {
    return this.getSection().locator("[data-testid='view-toggle-chart']");
  }

  getTableViewButton(): Locator {
    return this.getSection().locator("[data-testid='view-toggle-table']");
  }

  async switchToChartView(): Promise<void> {
    await this.getChartViewButton().click();
    await this.waitForLoad();
  }

  async switchToTableView(): Promise<void> {
    await this.getTableViewButton().click();
    await this.waitForLoad();
  }

  // Chart visualization
  getChart(): Locator {
    return this.getSection().locator("[data-testid='comparative-genomics-chart']");
  }

  async isChartVisible(): Promise<boolean> {
    return await this.getChart()
      .isVisible()
      .catch(() => false);
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
