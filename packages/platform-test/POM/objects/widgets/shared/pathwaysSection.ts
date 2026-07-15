import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Pathways section on Target pages.
 *
 * Displays biological pathway membership from Reactome, showing which cellular
 * processes and signaling cascades involve the target gene. Information includes:
 * - **Pathway name**: Specific pathway the target participates in
 * - **Top-level pathway**: Parent category (e.g., Signal Transduction, Metabolism)
 * - **Pathway browser link**: Direct link to interactive Reactome pathway diagram
 *
 * Helps understand the broader biological context and functions of a target.
 *
 * @example
 * ```typescript
 * const pathways = new PathwaysSection(page);
 * await pathways.waitForLoad();
 *
 * // Get pathway details
 * const rowCount = await pathways.getTableRows();
 * const pathwayName = await pathways.getPathwayName(0);
 * const topLevel = await pathways.getTopLevelPathway(0);
 *
 * // Navigate to Reactome
 * await pathways.clickPathwayBrowserLink(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `pathways`
 */
export class PathwaysSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-pathways']");
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
          const sect = document.querySelector("[data-testid='section-pathways']");
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

  // Pathway link (Reactome)
  async getPathwayLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='reactome']").first();
  }

  async clickPathwayLink(rowIndex: number): Promise<void> {
    const link = await this.getPathwayLink(rowIndex);
    await link.click();
  }

  async getPathwayName(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const firstCell = row.locator("td").first();
    return await firstCell.textContent();
  }

  // Top-level parent pathway
  async getTopLevelPathway(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const parentCell = row.locator("td").nth(1);
    return await parentCell.textContent();
  }

  // Pathway browser link (opens Reactome browser)
  async getPathwayBrowserLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='PathwayBrowser']");
  }

  async clickPathwayBrowserLink(rowIndex: number): Promise<void> {
    const link = await this.getPathwayBrowserLink(rowIndex);
    await link.click();
  }

  async hasPathwayBrowserLink(rowIndex: number): Promise<boolean> {
    const link = await this.getPathwayBrowserLink(rowIndex);
    return await link.isVisible().catch(() => false);
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
