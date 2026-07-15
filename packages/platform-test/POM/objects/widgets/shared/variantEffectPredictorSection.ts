import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Variant Effect Predictor (VEP) / Transcript Consequences section.
 *
 * Displays predicted consequences of a variant on overlapping transcripts,
 * computed using Ensembl's Variant Effect Predictor. Information includes:
 * - **Gene**: Affected gene with link to target page
 * - **Transcript ID**: Specific transcript affected
 * - **Predicted consequence**: SO term describing the variant effect
 * - **Impact**: Severity classification (HIGH, MODERATE, LOW, MODIFIER)
 * - **Amino acid change**: For coding variants, the resulting protein change
 *
 * Essential for understanding the functional impact of genetic variants.
 *
 * @example
 * ```typescript
 * const vep = new VariantEffectPredictorSection(page);
 * await vep.waitForLoad();
 *
 * // Get transcript consequences
 * const rowCount = await vep.getTableRows();
 * const geneName = await vep.getGeneName(0);
 * const consequence = await vep.getPredictedConsequence(0);
 * const impact = await vep.getImpact(0);
 *
 * // Navigate to gene
 * await vep.clickGeneLink(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `variant-effect-predictor`
 */
export class VariantEffectPredictorSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-variant-effect-predictor']");
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
          const sect = document.querySelector("[data-testid='section-variant-effect-predictor']");
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

  // Get gene link
  async getGeneLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/target/']");
  }

  async clickGeneLink(rowIndex: number): Promise<void> {
    const link = await this.getGeneLink(rowIndex);
    await link.scrollIntoViewIfNeeded();
    await link.click();
  }

  async getGeneName(rowIndex: number): Promise<string | null> {
    const link = await this.getGeneLink(rowIndex);
    return await link.textContent();
  }

  // Get predicted consequence
  async getPredictedConsequence(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(1);
    return await cell.textContent();
  }

  // Get impact
  async getImpact(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
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
