import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Known Drugs / Clinical Precedence section.
 *
 * Displays drugs that have been used to treat a disease or target,
 * including clinical trial information and approval status.
 * Supports searching, filtering, and pagination.
 *
 * @example
 * ```typescript
 * const drugs = new ClinicalPrecedenceSection(page);
 * await drugs.waitForSectionLoad();
 * const rowCount = await drugs.getRowCount();
 * const drugName = await drugs.getDrugName(0);
 * await drugs.searchDrug("aspirin");
 * ```
 *
 * @category KnownDrugs
 * @remarks Section ID: `knowndrugs`
 */
export class ClinicalPrecedenceSection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-knowndrugs']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection().isVisible();
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-knowndrugs-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
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

  getTableRows(): Locator {
    return this.getTable().locator("tbody tr");
  }

  async getRowCount(): Promise<number> {
    return await this.getTableRows().count();
  }

  // Get specific cells
  getDrugCell(rowIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).locator("td").first();
  }

  async getDrugName(rowIndex: number): Promise<string | null> {
    return await this.getDrugCell(rowIndex).textContent();
  }

  // Search/Filter
  getSearchInput(): Locator {
    return this.getSection().locator("input[type='text']");
  }

  async searchDrug(drugName: string): Promise<void> {
    await this.getSearchInput().fill(drugName);
  }

  // Pagination
  getNextPageButton(): Locator {
    return this.getSection().locator("[data-testid='next-page-button']");
  }

  getPreviousPageButton(): Locator {
    return this.getSection().locator("[data-testid='previous-page-button']");
  }

  async clickNextPage(): Promise<void> {
    await this.getNextPageButton().click();
  }

  async clickPreviousPage(): Promise<void> {
    await this.getPreviousPageButton().click();
  }

  // Wait for section to load
  async waitForSectionLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible" });
    await this.page.waitForTimeout(500);
  }
}
