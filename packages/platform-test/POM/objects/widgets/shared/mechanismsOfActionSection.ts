import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

/**
 * Interactor for Mechanisms of Action section
 */
export class MechanismsOfActionSection {
  constructor(private page: Page) {}

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-mechanismsofaction']");
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
          const sect = document.querySelector("[data-testid='section-mechanismsofaction']");
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

  // Get mechanism of action
  async getMechanismOfAction(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(0);
    return await cell.textContent();
  }

  // Get target name
  async getTargetName(rowIndex: number): Promise<string | null> {
    const row = await this.getTableRow(rowIndex);
    const cell = row.locator("td").nth(1);
    return await cell.textContent();
  }

  // Get target links
  async getTargetLinks(rowIndex: number): Promise<Locator> {
    const row = await this.getTableRow(rowIndex);
    return row.locator("a[href*='/target/']");
  }

  async getTargetLinksCount(rowIndex: number): Promise<number> {
    const links = await this.getTargetLinks(rowIndex);
    return await links.count();
  }

  async clickTargetLink(rowIndex: number, linkIndex: number = 0): Promise<void> {
    const links = await this.getTargetLinks(rowIndex);
    await links.nth(linkIndex).click();
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
