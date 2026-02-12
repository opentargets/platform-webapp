import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Mouse Phenotypes section on Target pages.
 *
 * Displays phenotypes observed in mouse models with gene knockouts or mutations,
 * sourced from the International Mouse Phenotyping Consortium (IMPC) and MGI.
 * Information includes:
 * - **Phenotype categories**: Grouped by biological system (e.g., cardiovascular, nervous)
 * - **Phenotype labels**: Specific observed effects with Mammalian Phenotype Ontology terms
 * - **Biological models**: Details about the mouse strains and genetic modifications
 *
 * Valuable for predicting potential effects of target modulation in humans.
 *
 * @example
 * ```typescript
 * const mousePhenotypes = new MousePhenotypesSection(page);
 * await mousePhenotypes.waitForLoad();
 *
 * // Get phenotype details
 * const rowCount = await mousePhenotypes.getTableRows();
 * const category = await mousePhenotypes.getPhenotypeCategory(0);
 * const label = await mousePhenotypes.getPhenotypeLabel(0);
 *
 * // View biological models
 * await mousePhenotypes.clickBiologicalModelsDrawer(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `mousephenotypes`
 */
export class MousePhenotypesSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-mousephenotypes']");
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
          const sect = document.querySelector("[data-testid='section-mousephenotypes']");
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

  // Phenotype class/category
  async getPhenotypeCategory(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const categoryCell = row.locator("td").first();
    return await categoryCell.textContent();
  }

  // Phenotype label
  async getPhenotypeLabel(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const labelCell = row.locator("td").nth(1);
    return await labelCell.textContent();
  }

  // Phenotype link (MP ontology)
  async getPhenotypeLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a").first();
  }

  async hasPhenotypeLink(rowIndex: number): Promise<boolean> {
    const link = await this.getPhenotypeLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  async clickPhenotypeLink(rowIndex: number): Promise<void> {
    const link = await this.getPhenotypeLink(rowIndex);
    await link.click();
  }

  // Biological models drawer
  async getBiologicalModelsDrawer(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("button, span").filter({ hasText: /model/i });
  }

  async hasBiologicalModelsDrawer(rowIndex: number): Promise<boolean> {
    const drawer = await this.getBiologicalModelsDrawer(rowIndex);
    return await drawer.isVisible().catch(() => false);
  }

  async clickBiologicalModelsDrawer(rowIndex: number): Promise<void> {
    const drawer = await this.getBiologicalModelsDrawer(rowIndex);
    await drawer.click();
  }

  // MGI link
  getMGILinks(): Locator {
    return this.getSection().locator("a[href*='mgi']");
  }

  async hasMGILinks(): Promise<boolean> {
    return (await this.getMGILinks().count()) > 0;
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
