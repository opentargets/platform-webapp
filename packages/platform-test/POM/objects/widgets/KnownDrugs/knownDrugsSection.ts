import type { Locator, Page } from "@playwright/test";

export class ClinicalPrecedenceSection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-drugs']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection().isVisible();
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-drugs-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Table
  getTable(): Locator {
    return this.getSection().locator("table").first();
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
    return this.getSection().locator("[data-testid='pagination-next-button']");
  }

  getPreviousPageButton(): Locator {
    return this.getSection().locator("[data-testid='pagination-previous-button']");
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
