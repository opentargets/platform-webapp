import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Drug Warnings section on Drug pages.
 *
 * Displays regulatory safety warnings and alerts associated with a drug,
 * including FDA black box warnings, withdrawals, and safety communications.
 * Information includes:
 * - **Warning type**: Category of the safety alert
 * - **Warning description**: Details about the safety concern
 * - **Adverse events**: Links to related MedDRA terms
 * - **References**: Links to regulatory sources
 *
 * @example
 * ```typescript
 * const warnings = new DrugWarningsSection(page);
 * await warnings.waitForLoad();
 *
 * // Get warning details
 * const rowCount = await warnings.getTableRows();
 * const warningType = await warnings.getWarningType(0);
 *
 * // Search warnings
 * await warnings.search("cardiac");
 * ```
 *
 * @category shared
 * @remarks Section ID: `drugwarnings`
 */
export class DrugWarningsSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-drugwarnings']");
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
          const sect = document.querySelector("[data-testid='section-drugwarnings']");
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

  // Get warning type
  async getWarningType(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(0);
    return await cell.textContent();
  }

  // Get adverse event link
  async getAdverseEventLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/disease/']").first();
  }

  async hasAdverseEventLink(rowIndex: number): Promise<boolean> {
    const link = await this.getAdverseEventLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  async clickAdverseEventLink(rowIndex: number): Promise<void> {
    const link = await this.getAdverseEventLink(rowIndex);
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
