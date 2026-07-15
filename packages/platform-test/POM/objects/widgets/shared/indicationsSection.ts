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

  getSection(): Locator {
    return this.page.locator("[data-testid='section-indications']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  /**
   * Wait for the section to finish loading (no skeleton loaders, table visible)
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

    // Wait for master table to be present
    await this.getMasterTable()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {});
  }

  /**
   * Get the master table (left panel with indication cards)
   */
  getMasterTable(): Locator {
    return this.getSection().locator("table").first();
  }

  /**
   * Get all indication card rows in the master table
   */
  async getMasterTableRows(): Promise<number> {
    const tbody = this.getMasterTable().locator("tbody");
    const rows = tbody.locator("tr");
    return await rows.count();
  }

  /**
   * Get a specific indication card row
   */
  async getMasterTableRow(index: number): Promise<Locator> {
    const tbody = this.getMasterTable().locator("tbody");
    return tbody.locator("tr").nth(index);
  }

  /**
   * Get the indication card container within a row
   */
  async getIndicationCard(rowIndex: number): Promise<Locator> {
    const row = await this.getMasterTableRow(rowIndex);
    return row.locator("td").first();
  }

  /**
   * Get indication (disease) link from a card
   */
  async getIndicationLink(rowIndex: number): Promise<Locator> {
    const card = await this.getIndicationCard(rowIndex);
    return card.locator("a[href*='/disease/']");
  }

  /**
   * Click the indication link (navigates to disease page)
   */
  async clickIndicationLink(rowIndex: number): Promise<void> {
    const link = await this.getIndicationLink(rowIndex);
    await link.click();
  }

  /**
   * Get indication name from a card
   */
  async getIndicationName(rowIndex: number): Promise<string | null> {
    const link = await this.getIndicationLink(rowIndex);
    return await link.textContent();
  }

  /**
   * Get max clinical stage text from a card
   */
  async getMaxStageFromCard(rowIndex: number): Promise<string | null> {
    const card = await this.getIndicationCard(rowIndex);
    // The max stage is shown as "Max stage: <label>"
    const maxStageText = await card.textContent();
    const match = maxStageText?.match(/Max stage:\s*(.+?)(?:\d+\s*report|$)/);
    return match ? match[1].trim() : null;
  }

  /**
   * Get report count from a card
   */
  async getReportCountFromCard(rowIndex: number): Promise<number> {
    const card = await this.getIndicationCard(rowIndex);
    const text = await card.textContent();
    const match = text?.match(/(\d+)\s*reports?/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Click an indication card to select it (loads reports in detail panel)
   */
  async selectIndicationCard(rowIndex: number): Promise<void> {
    const card = await this.getIndicationCard(rowIndex);
    await card.click();
    // Wait for detail panel to update
    await this.waitForDetailPanelLoad();
  }

  /**
   * Check if an indication card is currently selected
   */
  async isIndicationCardSelected(rowIndex: number): Promise<boolean> {
    const card = await this.getIndicationCard(rowIndex);
    // Selected cards have a primary color left border
    const borderColor = await card.evaluate((el) => {
      const style = window.getComputedStyle(el.querySelector("div") || el);
      return style.borderLeftColor;
    });
    // Check for non-transparent/non-white border (indicates selection)
    return borderColor !== "rgba(0, 0, 0, 0)" && borderColor !== "rgb(255, 255, 255)";
  }

  /**
   * Get the detail panel (right panel with clinical reports)
   */
  getDetailPanel(): Locator {
    // The detail panel contains the StageFilter and records table
    // It's the second major panel in the master-detail layout
    return this.getSection().locator("table").nth(1);
  }

  /**
   * Wait for detail panel to load after selecting an indication
   */
  async waitForDetailPanelLoad(): Promise<void> {
    // Wait for loading indicator to disappear
    await this.page
      .waitForFunction(
        () => {
          const sect = document.querySelector("[data-testid='section-indications']");
          if (!sect) return false;
          const loadingIndicators = sect.querySelectorAll(".MuiCircularProgress-root");
          return loadingIndicators.length === 0;
        },
        { timeout: 15000 }
      )
      .catch(() => {});
  }

  /**
   * Get the detail header text (e.g., "X reports for <entity>")
   */
  async getDetailHeaderText(): Promise<string | null> {
    const section = this.getSection();
    // Look for the subtitle that contains "reports for"
    const header = section.locator("h6:has-text('reports for'), p:has-text('reports for')").first();
    return await header.textContent().catch(() => null);
  }

  /**
   * Get the entity link in the detail header
   */
  getDetailEntityLink(): Locator {
    return this.getSection().locator("a[href*='/disease/']").nth(1);
  }

  // ========================
  // Stage Filter (Pipeline visualization)
  // ========================

  /**
   * Get all stage filter buttons/circles
   */
  getStageFilterButtons(): Locator {
    // Stage filter buttons are buttons within the header area
    return this.getSection().locator("th button");
  }

  /**
   * Get a specific stage button by stage name
   */
  async getStageButton(stageName: string): Promise<Locator | null> {
    const buttons = this.getStageFilterButtons();
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const parent = button.locator("xpath=ancestor::div[1]");
      const text = await parent
        .locator("span")
        .first()
        .textContent()
        .catch(() => "");
      if (text?.toLowerCase().includes(stageName.toLowerCase())) {
        return button;
      }
    }
    return null;
  }

  /**
   * Click a stage filter to show reports for that stage
   */
  async selectStage(stageName: string): Promise<void> {
    const button = await this.getStageButton(stageName);
    if (button) {
      await button.click();
      await this.page.waitForTimeout(300); // Brief wait for filter update
    }
  }

  /**
   * Get count of reports for a specific stage from the stage filter
   */
  async getStageReportCount(stageName: string): Promise<number> {
    const button = await this.getStageButton(stageName);
    if (!button) return 0;
    const text = await button.textContent();
    return text ? parseInt(text, 10) : 0;
  }

  /**
   * Get the records table in the detail panel
   */
  getRecordsTable(): Locator {
    return this.getSection().locator("table").nth(1);
  }

  /**
   * Get count of record rows in the detail panel
   */
  async getRecordsCount(): Promise<number> {
    const tbody = this.getRecordsTable().locator("tbody");
    const rows = tbody.locator("tr");
    return await rows.count();
  }

  /**
   * Get a specific record row
   */
  async getRecordRow(index: number): Promise<Locator> {
    const tbody = this.getRecordsTable().locator("tbody");
    return tbody.locator("tr").nth(index);
  }

  /**
   * Get record title from a row
   */
  async getRecordTitle(rowIndex: number): Promise<string | null> {
    const row = await this.getRecordRow(rowIndex);
    // Title is the first part (clickable, opens drawer)
    const title = row.locator("td p").first();
    return await title.textContent();
  }

  /**
   * Get record source from a row
   */
  async getRecordSource(rowIndex: number): Promise<string | null> {
    const row = await this.getRecordRow(rowIndex);
    const text = await row.textContent();
    // Source appears before "Status:" if present
    // Pattern: <title> <source> Status: <status> Start: <year>
    return text || null;
  }

  /**
   * Click a record title to open the detail drawer
   */
  async clickRecordTitle(rowIndex: number): Promise<void> {
    const row = await this.getRecordRow(rowIndex);
    const title = row.locator("td p").first();
    await title.click();
  }

  /**
   * Check if the record drawer is open
   */
  async isDrawerOpen(): Promise<boolean> {
    const drawer = this.page.locator(".MuiDrawer-root");
    return await drawer.isVisible().catch(() => false);
  }

  /**
   * Close the record drawer
   */
  async closeDrawer(): Promise<void> {
    // Click outside or press Escape
    await this.page.keyboard.press("Escape");
    await this.page.waitForTimeout(300);
  }

  /**
   * Get the search input in the master table
   */
  getSearchInput(): Locator {
    return this.getSection().locator("input[placeholder*='Search']");
  }

  /**
   * Search/filter indications
   */
  async search(searchTerm: string): Promise<void> {
    const searchInput = this.getSearchInput();
    await searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for filter to apply
  }

  /**
   * Clear search input
   */
  async clearSearch(): Promise<void> {
    const searchInput = this.getSearchInput();
    await searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * @deprecated Use getMasterTable() instead
   */
  getTable(): Locator {
    return this.getMasterTable();
  }

  /**
   * @deprecated Use getMasterTableRows() instead
   */
  async getTableRows(): Promise<number> {
    return this.getMasterTableRows();
  }

  /**
   * @deprecated Use getMasterTableRow() instead
   */
  async getTableRow(index: number): Promise<Locator> {
    return this.getMasterTableRow(index);
  }

  /**
   * @deprecated Max phase is now part of the card, use getMaxStageFromCard() instead
   */
  async getMaxPhase(rowIndex: number): Promise<string | null> {
    return this.getMaxStageFromCard(rowIndex);
  }
}
