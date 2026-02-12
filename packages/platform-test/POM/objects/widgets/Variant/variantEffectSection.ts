import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Variant Effect / In-Silico Predictors section.
 *
 * Displays computational predictions of variant effects from various
 * in-silico prediction methods. Supports both table and chart views
 * for visualizing prediction scores.
 *
 * @example
 * ```typescript
 * const variantEffect = new VariantEffectSection(page);
 * await variantEffect.waitForLoad();
 * const methodName = await variantEffect.getMethodName(0);
 * const prediction = await variantEffect.getPrediction(0);
 * await variantEffect.switchToChartView();
 * ```
 *
 * @category Variant
 * @remarks Section ID: `in-silico-predictors`
 */
export class VariantEffectSection {
  constructor(private page: Page) {}

  /**
   * Get the main section container element.
   * @returns Locator for the section container
   */
  getSection(): Locator {
    return this.page.locator("[data-testid='section-in-silico-predictors']");
  }

  /**
   * Check if the section is currently visible.
   * @returns Promise resolving to true if visible, false otherwise
   */
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
          const sect = document.querySelector("[data-testid='section-in-silico-predictors']");
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

  // Get method name from row
  async getMethodName(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const methodCell = row.locator("td").first();
    return await methodCell.textContent();
  }

  // Get prediction/assessment from row
  async getPrediction(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const predictionCell = row.locator("td").nth(1);
    return await predictionCell.textContent();
  }

  // Get score from row
  async getScore(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const scoreCell = row.locator("td").nth(2);
    return await scoreCell.textContent();
  }

  // Get normalised score from row
  async getNormalisedScore(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const normScoreCell = row.locator("td").nth(3);
    return await normScoreCell.textContent();
  }

  // View switcher (table/chart)
  getChartViewButton(): Locator {
    return this.getSection().locator("[data-testid='view-toggle-chart']");
  }

  getTableViewButton(): Locator {
    return this.getSection().locator("[data-testid='view-toggle-table']");
  }

  async switchToChartView(): Promise<void> {
    await this.getChartViewButton().click();
    await this.page.waitForTimeout(300); // Brief wait for view transition animation
  }

  async switchToTableView(): Promise<void> {
    await this.getTableViewButton().click();
    await this.page.waitForTimeout(500); // Wait for view transition
  }

  async isChartViewActive(): Promise<boolean> {
    // Check the chart button's aria-pressed state
    const button = this.getChartViewButton();
    const ariaPressed = await button.getAttribute("aria-pressed");
    return ariaPressed === "true";
  }

  async isTableViewActive(): Promise<boolean> {
    // Check the table button's aria-pressed state
    const button = this.getTableViewButton();
    const ariaPressed = await button.getAttribute("aria-pressed");
    return ariaPressed === "true";
  }

  // Chart
  getChart(): Locator {
    return this.getSection().locator("svg[class^='plot-']");
  }

  async isChartVisible(): Promise<boolean> {
    return await this.getChart()
      .isVisible()
      .catch(() => false);
  }
}
