import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Cancer DepMap (Dependency Map) section on Target pages.
 *
 * Displays gene essentiality data from the Broad Institute's DepMap project,
 * showing how essential a gene is for cancer cell survival across different
 * cell lines and cancer types. The visualization helps identify:
 * - **Essential genes**: Required for cell survival (potential drug targets)
 * - **Non-essential genes**: Not required for survival
 * - **Cancer-specific dependencies**: Genes essential only in certain cancer types
 *
 * Data is derived from genome-wide CRISPR-Cas9 knockout screens.
 *
 * @example
 * ```typescript
 * const depMap = new DepMapSection(page);
 * await depMap.waitForLoad();
 *
 * // Check if essentiality plot is displayed
 * const plotVisible = await depMap.isPlotVisible();
 *
 * // Export data
 * await depMap.clickExportData();
 * ```
 *
 * @category shared
 * @remarks Section ID: `depmapessentiality`
 */
export class DepMapSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-depmapessentiality']");
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
          const sect = document.querySelector("[data-testid='section-depmapessentiality']");
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

  // Visualization plot
  getPlot(): Locator {
    return this.getSection().locator("[data-testid='depmap-plot']");
  }

  async isPlotVisible(): Promise<boolean> {
    return await this.getPlot()
      .isVisible()
      .catch(() => false);
  }

  // Export data button
  getExportDataButton(): Locator {
    return this.getSection().locator("[data-testid='data-downloader']");
  }

  async isExportDataButtonVisible(): Promise<boolean> {
    return await this.getExportDataButton()
      .isVisible()
      .catch(() => false);
  }

  async clickExportData(): Promise<void> {
    await this.getExportDataButton().click();
  }
}
