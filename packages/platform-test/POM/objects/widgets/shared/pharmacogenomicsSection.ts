import type { Locator, Page } from "@playwright/test";
import { fillPolling } from "../../../../utils/fillPolling";

/**
 * Interactor for the Pharmacogenomics section on Target and Drug pages.
 *
 * Displays genetic variants that affect drug response, sourced from PharmGKB.
 * This information is crucial for personalized medicine and includes:
 * - **Genotype/Haplotype**: Specific genetic variant or combination
 * - **Drug**: Medication affected by the genetic variant
 * - **Phenotype**: Clinical outcome or drug response
 * - **Evidence level**: Strength of the pharmacogenomic association
 * - **Gene**: The gene containing the variant
 *
 * @example
 * ```typescript
 * const pharmaco = new PharmacogenomicsSection(page);
 * await pharmaco.waitForLoad();
 *
 * // Get pharmacogenomic associations
 * const rowCount = await pharmaco.getTableRows();
 * const genotype = await pharmaco.getGenotypeId(0);
 * const drugName = await pharmaco.getDrugName(0, 0);
 *
 * // Navigate to related pages
 * await pharmaco.clickDrugLink(0, 0);
 * await pharmaco.clickGeneLink(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `pharmacogenetics`
 */
export class PharmacogenomicsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-pharmacogenetics']");
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
          const sect = document.querySelector("[data-testid='section-pharmacogenetics']");
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

  // Get genotype ID from row
  async getGenotypeId(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const genotypeCell = row.locator("td").first();
    return await genotypeCell.textContent();
  }

  // Drug links - Not applicable for Drug page, only for Variant page
  async getDrugLinks(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/drug/']");
  }

  async getDrugLinksCount(rowIndex: number): Promise<number> {
    const links = await this.getDrugLinks(rowIndex);
    return await links.count();
  }

  async clickDrugLink(rowIndex: number, linkIndex: number = 0): Promise<void> {
    const links = await this.getDrugLinks(rowIndex);
    await links.nth(linkIndex).click();
  }

  async getDrugName(rowIndex: number, linkIndex: number = 0): Promise<string | null> {
    const links = await this.getDrugLinks(rowIndex);
    return await links.nth(linkIndex).textContent();
  }

  // Gene/Target link
  async getGeneLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("td").first().locator("a[href*='/target/']");
  }

  async hasGeneLink(rowIndex: number): Promise<boolean> {
    const link = await this.getGeneLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  async clickGeneLink(rowIndex: number): Promise<void> {
    const link = await this.getGeneLink(rowIndex);
    await link.click();
  }

  async getGeneName(rowIndex: number): Promise<string | null> {
    const link = await this.getGeneLink(rowIndex);
    return await link.textContent();
  }

  // Phenotype link (disease)
  async getPhenotypeLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("td").nth(2).locator("a[href*='/disease/']");
  }

  async hasPhenotypeLink(rowIndex: number): Promise<boolean> {
    const link = await this.getPhenotypeLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  async clickPhenotypeLink(rowIndex: number): Promise<void> {
    const link = await this.getPhenotypeLink(rowIndex);
    await link.click();
  }

  // Get confidence level from row
  async getConfidenceLevel(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    // Confidence level column has a colored badge
    const confidenceCell = row.locator("td").nth(7);
    return await confidenceCell.textContent();
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
    await fillPolling(this.getSearchInput(), searchTerm);
    await this.getSearchInput().press("Enter");
    await this.waitForLoad();
  }

  async clearSearch(): Promise<void> {
    await this.getSearchInput().clear();
    await this.waitForLoad();
  }
}
