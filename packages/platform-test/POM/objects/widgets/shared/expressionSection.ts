import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Baseline Expression section on Target page.
 *
 * Displays RNA and protein expression data with multiple tabs:
 * - **Summary**: Overview of expression across tissues
 * - **GTEx**: Detailed GTEx expression data
 *
 * Uses data-testid selectors for reliable, predictable testing.
 *
 * @example
 * ```typescript
 * const expression = new ExpressionSection(page);
 * await expression.waitForLoad();
 * await expression.clickGtexTab();
 * const isGtexVisible = await expression.isGtexContentVisible();
 * ```
 *
 * @category shared
 * @remarks Section ID: `expressions`
 */
export class ExpressionSection {
  constructor(private page: Page) {}

  /**
   * Get the main section container element.
   * @returns Locator for the section container
   */
  getSection(): Locator {
    return this.page.locator("[data-testid='section-expressions']");
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
   * Wait for the section to be visible
   */
  async waitForLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible", timeout: 10000 });
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-expressions-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Section description
  getSectionDescription(): Locator {
    return this.getSection().locator("[data-testid='section-description']");
  }

  // Tabs container
  getTabs(): Locator {
    return this.getSection().locator("[data-testid='expression-tabs']");
  }

  // Individual tabs
  getSummaryTab(): Locator {
    return this.getSection().locator("[data-testid='expression-tab-summary']");
  }

  getGtexTab(): Locator {
    return this.getSection().locator("[data-testid='expression-tab-gtex']");
  }

  async clickSummaryTab(): Promise<void> {
    await this.getSummaryTab().click();
    await this.waitForLoad();
  }

  async clickGtexTab(): Promise<void> {
    await this.getGtexTab().click();
    await this.waitForLoad();
  }

  // Tab content
  getSummaryContent(): Locator {
    return this.getSection().locator("[data-testid='expression-summary-content']");
  }

  getGtexContent(): Locator {
    return this.getSection().locator("[data-testid='expression-gtex-content']");
  }

  async isSummaryContentVisible(): Promise<boolean> {
    return await this.getSummaryContent()
      .isVisible()
      .catch(() => false);
  }

  async isGtexContentVisible(): Promise<boolean> {
    return await this.getGtexContent()
      .isVisible()
      .catch(() => false);
  }

  // Data downloader (in Summary tab)
  getDataDownloader(): Locator {
    return this.getSection().locator("[data-testid='data-downloader']");
  }

  async clickDataDownloader(): Promise<void> {
    await this.getDataDownloader().click();
  }
}
