import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Chemical Probes section on Target pages.
 *
 * Displays high-quality chemical probes that can be used to investigate
 * target biology. Data is sourced from the Chemical Probes Portal and includes:
 * - **Probe names**: Identifiers with links to external resources
 * - **Quality ratings**: Probe quality assessments (e.g., "Best available", "Historical")
 * - **Mechanisms of action**: How the probe interacts with the target
 * - **Selectivity information**: Off-target effects and specificity data
 *
 * Chemical probes are small molecules designed to selectively modulate protein
 * function for research purposes.
 *
 * @example
 * ```typescript
 * const chemicalProbes = new ChemicalProbesSection(page);
 * await chemicalProbes.waitForLoad();
 *
 * // Check if probes are available
 * const hasProbes = await chemicalProbes.isTableVisible();
 *
 * // Search for specific probe
 * await chemicalProbes.search("JQ1");
 *
 * // Download probe data
 * await chemicalProbes.clickDataDownloader();
 * ```
 *
 * @category shared
 * @remarks Section ID: `chemicalprobes`
 */
export class ChemicalProbesSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-chemicalprobes']");
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
    return this.page.locator("[data-testid='section-chemicalprobes-header']");
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
