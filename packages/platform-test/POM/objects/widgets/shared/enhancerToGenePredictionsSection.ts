import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Enhancer-to-Gene (E2G) Predictions section on Variant pages.
 *
 * Displays predictions linking non-coding variants in enhancer regions to their
 * potential target genes. Uses machine learning models to predict regulatory
 * relationships based on:
 * - **E2G Score**: Confidence score for the enhancer-gene link
 * - **Target gene**: The predicted regulated gene
 * - **Tissue/cell type**: Context where the regulation is predicted
 * - **Distance**: Genomic distance between variant and gene
 *
 * Helps interpret the functional impact of non-coding GWAS variants.
 *
 * @example
 * ```typescript
 * const e2g = new EnhancerToGenePredictionsSection(page);
 * await e2g.waitForLoad();
 *
 * // Get predictions
 * const rowCount = await e2g.getTableRows();
 * const geneName = await e2g.getTargetGeneName(0);
 * const score = await e2g.getE2GScore(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `enhancer-to-gene-predictions`
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
    await section.waitFor({ state: "visible", timeout: 10000 });

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
