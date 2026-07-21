import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Enhancer-to-Gene Predictions section on Variant page
 */
export class EnhancerToGenePredictionsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-enhancer-to-gene-predictions']");
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
    await section.waitFor({ state: "visible", timeout: 20000 });

    // Wait for skeleton loaders to disappear
    await this.page
      .waitForFunction(
        () => {
          const sect = document.querySelector(
            "[data-testid='section-enhancer-to-gene-predictions']"
          );
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

  async getTableRows(): Promise<number> {
    const tbody = this.getTable().locator("tbody");
    const rows = tbody.locator("tr");
    return await rows.count();
  }

  async getTableRow(index: number): Promise<Locator> {
    const tbody = this.getTable().locator("tbody");
    return tbody.locator("tr").nth(index);
  }

  // Get target gene link
  async getTargetGeneLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/target/']");
  }

  async clickTargetGeneLink(rowIndex: number): Promise<void> {
    const link = await this.getTargetGeneLink(rowIndex);
    await link.scrollIntoViewIfNeeded();
    await link.click();
  }

  async getTargetGeneName(rowIndex: number): Promise<string | null> {
    const link = await this.getTargetGeneLink(rowIndex);
    return await link.textContent();
  }

  // Get E2G score
  async getE2GScore(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    // Score is typically in a specific column, adjust index as needed
    const cell = row.locator("td").nth(2);
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
}
