import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Locus-to-Gene (L2G) section on Credible Set page
 * Section ID: locus2gene
 */
export class Locus2GeneSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-locus2gene']");
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
          const sect = document.querySelector("[data-testid='section-locus2gene']");
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

  // L2G uses a HeatmapTable, so we interact with it differently
  getHeatmapTable(): Locator {
    return this.getSection().locator("table");
  }

  async isHeatmapVisible(): Promise<boolean> {
    return await this.getHeatmapTable()
      .isVisible()
      .catch(() => false);
  }

  async getTableRows(): Promise<number> {
    const tbody = this.getHeatmapTable().locator("tbody");
    const rows = tbody.locator("tr");
    return await rows.count();
  }

  async getTableRow(index: number): Promise<Locator> {
    const tbody = this.getHeatmapTable().locator("tbody");
    return tbody.locator("tr").nth(index);
  }

  // Target gene link
  async getTargetGeneLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/target/']");
  }

  async clickTargetGeneLink(rowIndex: number): Promise<void> {
    const link = await this.getTargetGeneLink(rowIndex);
    await link.click();
  }

  async getTargetGeneName(rowIndex: number): Promise<string | null> {
    const link = await this.getTargetGeneLink(rowIndex);
    return await link.textContent();
  }

  async hasTargetGeneLink(rowIndex: number): Promise<boolean> {
    const link = await this.getTargetGeneLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  // L2G Score
  async getL2GScore(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    // L2G score is typically in the second column
    const cell = row.locator("td").nth(1);
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
}
