import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for the Adverse Events (Pharmacovigilance) section on Drug pages.
 *
 * Displays adverse event data from the FDA Adverse Event Reporting System (FAERS),
 * including event names with MedDRA links, reported event counts, and log likelihood
 * ratios indicating the strength of the drug-adverse event association.
 *
 * @example
 * ```typescript
 * const adverseEvents = new PharmacovigilanceSection(page);
 * await adverseEvents.waitForLoad();
 *
 * // Get number of adverse events
 * const rowCount = await adverseEvents.getTableRows();
 *
 * // Get details of first adverse event
 * const eventName = await adverseEvents.getAdverseEventName(0);
 * const llr = await adverseEvents.getLogLikelihoodRatio(0);
 * ```
 *
 * @category shared
 * @remarks Section ID: `adverseevents`
 */
export class PharmacovigilanceSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-adverseevents']");
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
          const sect = document.querySelector("[data-testid='section-adverseevents']");
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

  // Get adverse event name
  async getAdverseEventName(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(0);
    return await cell.textContent();
  }

  // Get adverse event link (MedDRA)
  async getAdverseEventLink(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='identifiers.org/meddra']");
  }

  async hasAdverseEventLink(rowIndex: number): Promise<boolean> {
    const link = await this.getAdverseEventLink(rowIndex);
    return await link.isVisible().catch(() => false);
  }

  async clickAdverseEventLink(rowIndex: number): Promise<void> {
    const link = await this.getAdverseEventLink(rowIndex);
    await link.click();
  }

  // Get count of reported events
  async getReportedEventsCount(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(1);
    return await cell.textContent();
  }

  // Get log likelihood ratio
  async getLogLikelihoodRatio(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(2);
    return await cell.textContent();
  }
}
