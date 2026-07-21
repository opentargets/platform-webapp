import type { Locator, Page } from "@playwright/test";

export class QTLCredibleSetsSection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-qtl-credible-sets']");
  }

  /**
   * Check if section is visible - waits for page loaders first
   */
  async isSectionVisible(): Promise<boolean> {
    // First wait for any page-level skeleton loaders to disappear
    await this.page
      .waitForFunction(
        () => {
          const skeletons = document.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // No skeletons found
      });

    // Then check section visibility
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-qtl-credible-sets-header']");
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

  // Get cell data
  getCell(rowIndex: number, columnIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).locator("td").nth(columnIndex);
  }

  async getCellText(rowIndex: number, columnIndex: number): Promise<string | null> {
    return await this.getCell(rowIndex, columnIndex).textContent();
  }

  // Get variant link
  getVariantLink(rowIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).locator("a[href*='/variant/']");
  }

  async clickVariantLink(rowIndex: number): Promise<void> {
    await this.getVariantLink(rowIndex).click();
  }

  async getVariantId(rowIndex: number): Promise<string | null> {
    return await this.getVariantLink(rowIndex).textContent();
  }

  // Search/Filter
  getSearchInput(): Locator {
    return this.getSection().locator("input[type='text']");
  }

  async searchCredibleSet(searchTerm: string): Promise<void> {
    await this.getSearchInput().fill(searchTerm);
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

  async isNextPageEnabled(): Promise<boolean> {
    return await this.getNextPageButton().isEnabled();
  }

  async isPreviousPageEnabled(): Promise<boolean> {
    return await this.getPreviousPageButton().isEnabled();
  }

  // Wait for section to load
  async waitForSectionLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible", timeout: 20000 });

    // Wait for skeleton loaders to disappear
    await this.page
      .waitForFunction(
        () => {
          const sect = document.querySelector("[data-testid='section-qtl-credible-sets']");
          if (!sect) return false;
          const skeletons = sect.querySelectorAll(".MuiSkeleton-root");
          return skeletons.length === 0;
        },
        { timeout: 15000 }
      )
      .catch(() => {
        // No skeletons found, section already loaded
      });
  }
}
