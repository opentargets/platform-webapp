import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the QTL Credible Sets section on Variant pages.
 *
 * Displays molecular QTL (Quantitative Trait Loci) credible sets containing
 * the variant, including expression QTLs (eQTLs), splicing QTLs (sQTLs),
 * and protein QTLs (pQTLs). Information includes:
 * - **Credible set ID**: Links to detailed credible set analysis
 * - **Study**: QTL study identifier and type (eQTL, sQTL, pQTL)
 * - **Affected gene**: Gene whose expression/splicing is affected
 * - **Tissue**: Biological context where the QTL effect is observed
 *
 * Helps link non-coding variants to their molecular effects on gene regulation.
 *
 * @example
 * ```typescript
 * const qtlCredibleSets = new QTLCredibleSetsSection(page);
 * await qtlCredibleSets.waitForLoad();
 *
 * // Get QTL data
 * const rowCount = await qtlCredibleSets.getTableRows();
 *
 * // Navigate to related pages
 * await qtlCredibleSets.clickCredibleSetLink(0);
 * await qtlCredibleSets.clickAffectedGeneLink(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `qtl-credible-sets`
 */
export class QTLCredibleSetsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-qtl-credible-sets']");
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
          const sect = document.querySelector("[data-testid='section-qtl-credible-sets']");
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

  // Credible set link
  async getCredibleSetLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/credible-set/']");
  }

  async clickCredibleSetLink(rowIndex: number): Promise<void> {
    const link = await this.getCredibleSetLink(rowIndex);
    await link.click();
  }

  // Study link
  async getStudyLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/study/']");
  }

  async clickStudyLink(rowIndex: number): Promise<void> {
    const link = await this.getStudyLink(rowIndex);
    await link.click();
  }

  // Affected gene link
  async getAffectedGeneLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/target/']");
  }

  async clickAffectedGeneLink(rowIndex: number): Promise<void> {
    const link = await this.getAffectedGeneLink(rowIndex);
    await link.click();
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
