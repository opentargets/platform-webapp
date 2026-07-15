import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Genetic Constraint section on Target pages.
 *
 * Displays evolutionary constraint metrics from gnomAD (Genome Aggregation Database),
 * indicating how tolerant a gene is to different types of mutations. Metrics include:
 * - **pLI (Loss-of-function intolerance)**: Probability gene is intolerant to LoF variants
 * - **LOEUF**: Loss-of-function observed/expected upper bound fraction
 * - **Missense constraint**: Z-score for missense variant depletion
 * - **Synonymous constraint**: Z-score for synonymous variant depletion
 *
 * High constraint scores suggest the gene is essential and mutations may be disease-causing.
 *
 * @example
 * ```typescript
 * const constraint = new GeneticConstraintSection(page);
 * await constraint.waitForLoad();
 *
 * // Get constraint metrics
 * const rowCount = await constraint.getTableRows();
 * const constraintType = await constraint.getConstraintType(0);
 * const score = await constraint.getScore(0);
 *
 * // Link to gnomAD
 * await constraint.clickGnomadLink();
 * ```
 *
 * @category shared
 * @remarks Section ID: `geneticconstraint`
 */
export class GeneticConstraintSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-geneticconstraint']");
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
          const sect = document.querySelector("[data-testid='section-geneticconstraint']");
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

  // Constraint type (pLI, LOEUF, etc.)
  async getConstraintType(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const typeCell = row.locator("td").first();
    return await typeCell.textContent();
  }

  // Observed value
  async getObservedValue(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const obsCell = row.locator("td").nth(1);
    return await obsCell.textContent();
  }

  // Expected value
  async getExpectedValue(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const expCell = row.locator("td").nth(2);
    return await expCell.textContent();
  }

  // O/E ratio
  async getOERatio(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const oeCell = row.locator("td").nth(3);
    return await oeCell.textContent();
  }

  // Score/pLI value
  async getScore(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const scoreCell = row.locator("td").last();
    return await scoreCell.textContent();
  }

  // gnomAD link
  getGnomadLink(): Locator {
    return this.getSection().locator("a[href*='gnomad']");
  }

  async hasGnomadLink(): Promise<boolean> {
    return await this.getGnomadLink()
      .isVisible()
      .catch(() => false);
  }

  async clickGnomadLink(): Promise<void> {
    await this.getGnomadLink().click();
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
