import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the GWAS Credible Sets section (shared across Variant and Study pages).
 *
 * Displays fine-mapped credible sets from GWAS studies, representing the set of
 * variants most likely to contain the causal variant. Information includes:
 * - **Credible set ID**: Unique identifier linking to detailed credible set page
 * - **Lead variant**: The most significant variant in the set
 * - **Study information**: GWAS study ID and reported trait
 * - **L2G gene**: Top gene from Locus-to-Gene prediction
 * - **Posterior probability**: Statistical confidence for causal variants
 *
 * Used for both Variant pages (showing credible sets containing the variant)
 * and Study pages (showing all credible sets from a study).
 *
 * @example
 * ```typescript
 * const gwasCredibleSets = new GWASCredibleSetsSection(page);
 * await gwasCredibleSets.waitForLoad();
 *
 * // Get credible set details
 * const rowCount = await gwasCredibleSets.getTableRows();
 * const credibleSetId = await gwasCredibleSets.getCredibleSetId(0);
 *
 * // Navigate to related pages
 * await gwasCredibleSets.clickCredibleSetLink(0);
 * await gwasCredibleSets.clickStudyLink(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `gwas-credible-sets`
 */
export class GWASCredibleSetsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-gwas-credible-sets']");
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
          const sect = document.querySelector("[data-testid='section-gwas-credible-sets']");
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

  async getCredibleSetId(rowIndex: number): Promise<string | null> {
    const link = await this.getCredibleSetLink(rowIndex);
    const href = await link.getAttribute("href");
    // Extract ID from href like "/credible-set/3afad64401516cb9221ad8d17656d547"
    return href?.split("/credible-set/")[1] || null;
  }

  // Lead variant
  async getLeadVariantLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("td").nth(1).locator("a[href*='/variant/']");
  }

  async hasLeadVariantLink(rowIndex: number): Promise<boolean> {
    const link = await this.getLeadVariantLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  async clickLeadVariantLink(rowIndex: number): Promise<void> {
    const link = await this.getLeadVariantLink(rowIndex);
    await link.click();
  }

  // Disease links
  async getDiseaseLinks(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("td").nth(3).locator("a[href*='/disease/']");
  }

  async getDiseaseLinksCount(rowIndex: number): Promise<number> {
    const links = await this.getDiseaseLinks(rowIndex);
    return await links.count();
  }

  async clickDiseaseLink(rowIndex: number, linkIndex: number = 0): Promise<void> {
    const links = await this.getDiseaseLinks(rowIndex);
    await links.nth(linkIndex).click();
  }

  // Study link
  async getStudyLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("td").nth(4).locator("a[href*='/study/']");
  }

  async clickStudyLink(rowIndex: number): Promise<void> {
    const link = await this.getStudyLink(rowIndex);
    await link.click();
  }

  async getStudyId(rowIndex: number): Promise<string | null> {
    const link = await this.getStudyLink(rowIndex);
    return await link.textContent();
  }

  // L2G gene link
  async getL2GGeneLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/target/']");
  }

  async hasL2GGeneLink(rowIndex: number): Promise<boolean> {
    const link = await this.getL2GGeneLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  async clickL2GGeneLink(rowIndex: number): Promise<void> {
    const link = await this.getL2GGeneLink(rowIndex);
    await link.click();
  }

  async getL2GGeneName(rowIndex: number): Promise<string | null> {
    const link = await this.getL2GGeneLink(rowIndex);
    return await link.textContent();
  }

  // Pagination
  getNextPageButton(): Locator {
    return this.getSection().locator("button[aria-label='Next Page']");
  }

  getPreviousPageButton(): Locator {
    return this.getSection().locator("button[aria-label='Previous Page']");
  }

  async clickNextPage(): Promise<void> {
    await this.getNextPageButton().click();
    await this.waitForLoad();
  }

  async clickPreviousPage(): Promise<void> {
    await this.getPreviousPageButton().click();
    await this.waitForLoad();
  }

  async isNextPageEnabled(): Promise<boolean> {
    return await this.getNextPageButton().isEnabled();
  }

  async isPreviousPageEnabled(): Promise<boolean> {
    return await this.getPreviousPageButton().isEnabled();
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

  // Additional methods for Study page compatibility
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-gwas-credible-sets-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  async isTableVisible(): Promise<boolean> {
    return await this.getTable()
      .isVisible()
      .catch(() => false);
  }

  async getRowCount(): Promise<number> {
    return await this.getTableRows();
  }

  async getCellText(rowIndex: number, columnIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(columnIndex);
    return await cell.textContent();
  }

  async getVariantId(rowIndex: number): Promise<string | null> {
    const link = await this.getLeadVariantLink(rowIndex);
    return await link.textContent();
  }

  async clickVariantLink(rowIndex: number): Promise<void> {
    await this.clickLeadVariantLink(rowIndex);
  }

  async searchCredibleSet(searchTerm: string): Promise<void> {
    await this.search(searchTerm);
  }

  async waitForSectionLoad(): Promise<void> {
    await this.waitForLoad();
  }
}
