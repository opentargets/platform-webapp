import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Credible Set Variants section on Credible Set page
 * Section ID: variants
 * data-testid: section-variants
 */
export class CredibleSetVariantsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-variants']");
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
          const sect = document.querySelector("[data-testid='section-variants']");
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

  // Variant link
  async getVariantLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/variant/']");
  }

  async clickVariantLink(rowIndex: number): Promise<void> {
    const link = await this.getVariantLink(rowIndex);
    await link.click();
  }

  async getVariantId(rowIndex: number): Promise<string | null> {
    const link = await this.getVariantLink(rowIndex);
    return await link.textContent();
  }

  async hasVariantLink(rowIndex: number): Promise<boolean> {
    const link = await this.getVariantLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  // Lead variant badge
  async isLeadVariant(rowIndex: number): Promise<boolean> {
    const row = await this.getTableRow(rowIndex);
    const leadBadge = row.locator("text=lead");
    return await leadBadge.isVisible().catch(() => false);
  }

  // P-value
  async getPValue(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(1);
    return await cell.textContent();
  }

  // Beta
  async getBeta(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(2);
    return await cell.textContent();
  }

  // Standard error
  async getStandardError(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(3);
    return await cell.textContent();
  }

  // LD (r²)
  async getLDR2(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(4);
    return await cell.textContent();
  }

  // Posterior Probability
  async getPosteriorProbability(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(5);
    return await cell.textContent();
  }

  // log(BF)
  async getLogBF(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(6);
    return await cell.textContent();
  }

  // Predicted consequence link
  async getPredictedConsequenceLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='identifiers.org/SO']");
  }

  async getPredictedConsequence(rowIndex: number): Promise<string | null> {
    const link = await this.getPredictedConsequenceLink(rowIndex);
    return await link.textContent();
  }

  async hasPredictedConsequenceLink(rowIndex: number): Promise<boolean> {
    const link = await this.getPredictedConsequenceLink(rowIndex);
    return await link.isVisible().catch(() => false);
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

  // Column visibility button
  getColumnsButton(): Locator {
    return this.getSection().locator("button:has-text('Columns')");
  }

  // Export button
  getExportButton(): Locator {
    return this.getSection().locator("button:has-text('Export')");
  }

  // API query button
  getAPIQueryButton(): Locator {
    return this.getSection().locator("button:has-text('API query')");
  }
}
