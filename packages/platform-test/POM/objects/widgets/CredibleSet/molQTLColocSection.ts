import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for MolQTL Colocalisation section on Credible Set page
 * Section ID: molqtl_coloc
 * data-testid: section-molqtl-coloc (underscore replaced with hyphen)
 */
export class MolQTLColocSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-molqtl-coloc']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for the section to finish loading (no skeleton loaders)
   */
  async waitForLoad(): Promise<void> {
    const section = this.getSection();
    await section.waitFor({ state: "visible", timeout: 10000 });

    // Wait for skeleton loaders to disappear
    await this.page
      .waitForFunction(
        () => {
          const sect = document.querySelector("[data-testid='section-molqtl-coloc']");
          if (!sect) return false;
          const skeletons = sect.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // If no skeletons found, section already loaded
      });
  }

  // Table
  getTable(): Locator {
    return this.getSection().locator("table");
  }

  async isTableVisible(): Promise<boolean> {
    return await this.getTable()
      .isVisible()
      .catch(() => false);
  }

  async getTableRows(): Promise<number> {
    const tbody = this.getTable().locator("tbody");
    const rows = tbody.locator("tr");
    return await rows.count();
  }

  async getTableRow(index: number): Promise<Locator> {
    const tbody = this.getTable().locator("tbody");
    return tbody.locator("tr").nth(index);
  }

  // Credible set link (Navigate component)
  async getCredibleSetLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/credible-set/']");
  }

  async clickCredibleSetLink(rowIndex: number): Promise<void> {
    const link = await this.getCredibleSetLink(rowIndex);
    await link.click();
  }

  async hasCredibleSetLink(rowIndex: number): Promise<boolean> {
    const link = await this.getCredibleSetLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  // Study link
  async getStudyLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/study/']");
  }

  async clickStudyLink(rowIndex: number): Promise<void> {
    const link = await this.getStudyLink(rowIndex);
    await link.click();
  }

  async getStudyId(rowIndex: number): Promise<string | null> {
    const link = await this.getStudyLink(rowIndex);
    return await link.textContent();
  }

  async hasStudyLink(rowIndex: number): Promise<boolean> {
    const link = await this.getStudyLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  // Study type
  async getStudyType(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(2);
    return await cell.textContent();
  }

  // Affected gene (target) link
  async getAffectedGeneLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/target/']");
  }

  async clickAffectedGeneLink(rowIndex: number): Promise<void> {
    const link = await this.getAffectedGeneLink(rowIndex);
    await link.click();
  }

  async getAffectedGeneName(rowIndex: number): Promise<string | null> {
    const link = await this.getAffectedGeneLink(rowIndex);
    return await link.textContent();
  }

  async hasAffectedGeneLink(rowIndex: number): Promise<boolean> {
    const link = await this.getAffectedGeneLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  // Affected tissue/cell (external link to OLS)
  async getAffectedTissueLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='ebi.ac.uk/ols4']");
  }

  async getAffectedTissueName(rowIndex: number): Promise<string | null> {
    const link = await this.getAffectedTissueLink(rowIndex);
    return await link.textContent();
  }

  async hasAffectedTissueLink(rowIndex: number): Promise<boolean> {
    const link = await this.getAffectedTissueLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  // Condition
  async getCondition(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(5);
    return await cell.textContent();
  }

  // Lead variant link
  async getLeadVariantLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/variant/']");
  }

  async clickLeadVariantLink(rowIndex: number): Promise<void> {
    const link = await this.getLeadVariantLink(rowIndex);
    await link.click();
  }

  async hasLeadVariantLink(rowIndex: number): Promise<boolean> {
    const link = await this.getLeadVariantLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  // P-Value
  async getPValue(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(7);
    return await cell.textContent();
  }

  // Colocalising variants count
  async getColocalisingVariantsCount(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(8);
    return await cell.textContent();
  }

  // Colocalisation method
  async getColocalisationMethod(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(9);
    return await cell.textContent();
  }

  // Directionality
  async getDirectionality(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(10);
    return await cell.textContent();
  }

  // H3 value
  async getH3(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(11);
    return await cell.textContent();
  }

  // H4 value
  async getH4(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(12);
    return await cell.textContent();
  }

  // CLPP value
  async getCLPP(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(13);
    return await cell.textContent();
  }

  // Cell text by column index
  async getCellText(rowIndex: number, columnIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(columnIndex);
    return await cell.textContent();
  }

  // Global filter/search
  getSearchInput(): Locator {
    return this.getSection().locator("input[placeholder*='Search']");
  }

  async search(searchTerm: string): Promise<void> {
    await this.getSearchInput().fill(searchTerm);
    await this.waitForLoad();
  }

  async clearSearch(): Promise<void> {
    await this.getSearchInput().clear();
    await this.waitForLoad();
  }

  // Pagination
  getNextPageButton(): Locator {
    return this.getSection().locator("button[aria-label='Next Page']");
  }

  getPreviousPageButton(): Locator {
    return this.getSection().locator("button[aria-label='Previous Page']");
  }

  async clickNextPage(): Promise<void> {
    await this.getNextPageButton().click();
    await this.waitForLoad();
  }

  async clickPreviousPage(): Promise<void> {
    await this.getPreviousPageButton().click();
    await this.waitForLoad();
  }

  async isNextPageEnabled(): Promise<boolean> {
    return await this.getNextPageButton().isEnabled();
  }

  async isPreviousPageEnabled(): Promise<boolean> {
    return await this.getPreviousPageButton().isEnabled();
  }

  // Data downloader
  getDataDownloaderButton(): Locator {
    return this.getSection().locator("button[aria-label*='download']");
  }

  async clickDataDownloader(): Promise<void> {
    await this.getDataDownloaderButton().click();
  }
}
