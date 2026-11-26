import type { Locator, Page } from "@playwright/test";

export class OTProjectsSection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-otprojects']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection().isVisible();
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-otprojects-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Projects table
  getTable(): Locator {
    return this.getSection().locator("table");
  }

  getProjectCards(): Locator {
    return this.getTable().locator("tbody tr");
  }

  async getProjectCount(): Promise<number> {
    return await this.getProjectCards().count();
  }

  getProjectCard(index: number): Locator {
    return this.getProjectCards().nth(index);
  }

  async getProjectTitle(index: number): Promise<string | null> {
    return await this.getProjectCard(index).locator("td").first().textContent();
  }

  // Project links
  getProjectLink(index: number): Locator {
    return this.getProjectCard(index).locator("a").first();
  }

  async clickProject(index: number): Promise<void> {
    await this.getProjectLink(index).click();
  }

  // Wait for section to load
  async waitForSectionLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible" });
    await this.page.waitForTimeout(500);
  }
}
