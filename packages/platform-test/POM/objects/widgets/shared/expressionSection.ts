import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * Interactor for Baseline Expression section on Target page
 * Displays RNA and protein expression data with tabs (Summary, GTEx)
 */
export class ExpressionSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-baselineexpression']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for the section to be visible
   */
  async waitForLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-baselineexpression-header']");
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
    return this.getSection().locator("[role='tablist']");
  }

  // Individual tabs
  getSummaryTab(): Locator {
    return this.getSection().locator("[role='tab']:has-text('Summary')");
  }

  getGtexTab(): Locator {
    return this.getSection().locator("[role='tab']:has-text('GTEx')");
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
    return this.getSection().locator("table");
  }

  getGtexContent(): Locator {
    return this.getSection().locator("svg");
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
