import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the UniProt Variants section on Variant pages.
 *
 * Displays variant annotations from UniProtKB, including natural variants,
 * disease-associated mutations, and sequence conflicts. Information includes:
 * - **Disease/Phenotype**: Associated conditions from UniProt annotations
 * - **Variant description**: Functional impact and literature evidence
 * - **Cross-references**: Links to disease databases (OMIM, etc.)
 *
 * Complements ClinVar data with protein-focused variant annotations.
 *
 * @example
 * ```typescript
 * const uniprotVariants = new UniProtVariantsSection(page);
 * await uniprotVariants.waitForLoad();
 *
 * // Get variant annotations
 * const rowCount = await uniprotVariants.getTableRows();
 *
 * // Navigate to disease pages
 * const diseaseCount = await uniprotVariants.getDiseaseLinksCount(0);
 * await uniprotVariants.clickDiseaseLink(0, 0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `uniprot-variants`
 */
export class UniProtVariantsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-uniprot-variants']");
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
          const sect = document.querySelector("[data-testid='section-uniprot-variants']");
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
  async getDiseasePhenotypeLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/disease/']");
  }

  async clickDiseasePhenotypeLink(rowIndex: number): Promise<void> {
    const link = await this.getDiseasePhenotypeLink(rowIndex);
    await link.scrollIntoViewIfNeeded();
    await link.click();
  }

  // Get disease links
  async getDiseaseLinks(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/disease/']");
  }

  async getDiseaseLinksCount(rowIndex: number): Promise<number> {
    const links = await this.getDiseaseLinks(rowIndex);
    return await links.count();
  }

  async clickDiseaseLink(rowIndex: number, linkIndex: number = 0): Promise<void> {
    const links = await this.getDiseaseLinks(rowIndex);
    await links.nth(linkIndex).click();
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
