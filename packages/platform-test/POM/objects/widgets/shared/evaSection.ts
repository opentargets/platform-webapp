import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the EVA/ClinVar section on Variant pages.
 *
 * Displays clinical variant annotations from the European Variation Archive (EVA)
 * and NCBI ClinVar database. Information includes:
 * - **Clinical significance**: Pathogenic, benign, uncertain significance, etc.
 * - **Associated diseases**: Conditions linked to the variant
 * - **Review status**: Level of evidence supporting the classification
 * - **Submitter information**: Organizations that submitted the annotation
 *
 * Essential for understanding the clinical relevance of genetic variants.
 *
 * @example
 * ```typescript
 * const eva = new EVASection(page);
 * await eva.waitForLoad();
 *
 * // Get clinical annotations
 * const rowCount = await eva.getTableRows();
 * const significance = await eva.getClinicalSignificance(0);
 *
 * // Navigate to disease
 * await eva.clickDiseaseLink(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `eva`
 */
export class EVASection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-eva']");
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
          const sect = document.querySelector("[data-testid='section-eva']");
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

  // Get disease link
  async getDiseaseLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/disease/']");
  }

  async clickDiseaseLink(rowIndex: number): Promise<void> {
    const link = await this.getDiseaseLink(rowIndex);
    await link.scrollIntoViewIfNeeded();
    await link.click();
  }

  // Get clinical significance
  async getClinicalSignificance(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
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
}
