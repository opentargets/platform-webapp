import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Indications section on Drug pages.
 *
 * Displays therapeutic indications (approved uses) for a drug, sourced from
 * ChEMBL and other regulatory databases. Information includes:
 * - **Indication name**: Disease or condition the drug treats
 * - **Max phase**: Highest clinical trial phase reached
 * - **References**: Links to supporting regulatory sources
 *
 * Shows both approved indications and those in clinical development.
 *
 * @example
 * ```typescript
 * const indications = new IndicationsSection(page);
 * await indications.waitForLoad();
 *
 * // Get indication details
 * const rowCount = await indications.getTableRows();
 * const indicationName = await indications.getIndicationName(0);
 * const maxPhase = await indications.getMaxPhase(0);
 *
 * // Navigate to disease page
 * await indications.clickIndicationLink(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `indications`
 */
export class IndicationsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-indications']");
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
          const sect = document.querySelector("[data-testid='section-indications']");
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

  // Get indication (disease) link
  async getIndicationLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    // Get link from first column (indication column) specifically
    return row.locator("td").first().locator("a[href*='/disease/']");
  }

  async clickIndicationLink(rowIndex: number): Promise<void> {
    const link = await this.getIndicationLink(rowIndex);
    await link.click();
  }

  async getIndicationName(rowIndex: number): Promise<string | null> {
    const link = await this.getIndicationLink(rowIndex);
    return await link.textContent();
  }

  // Get max phase
  async getMaxPhase(rowIndex: number): Promise<string | null> {
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
