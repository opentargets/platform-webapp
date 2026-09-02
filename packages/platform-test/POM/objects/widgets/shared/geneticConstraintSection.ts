import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * Interactor for Genetic Constraint section on Target page
 * Displays constraint metrics from gnomAD
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
    await section.waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });

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
