import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * Interactor for Cancer DepMap section on Target page
 * Displays gene essentiality data from DepMap as a visualization plot
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
    await section.waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });

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
