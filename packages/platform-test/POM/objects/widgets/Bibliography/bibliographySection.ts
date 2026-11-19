import type { Locator, Page } from "@playwright/test";

export class BibliographySection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-bibliography']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection().isVisible();
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-bibliography-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Literature entries
  getLiteratureEntries(): Locator {
    return this.getSection().locator("[data-testid^='literature-entry-']");
  }

  async getLiteratureCount(): Promise<number> {
    return await this.getLiteratureEntries().count();
  }

  getLiteratureEntry(index: number): Locator {
    return this.getLiteratureEntries().nth(index);
  }

  async getLiteratureTitle(index: number): Promise<string | null> {
    const entry = this.getLiteratureEntry(index);
    const title = entry.locator("a").first();
    return await title.textContent();
  }

  // PubMed links
  getPubMedLink(index: number): Locator {
    return this.getLiteratureEntry(index).locator("a[href*='europepmc.org']");
  }

  async clickPubMedLink(index: number): Promise<void> {
    await this.getPubMedLink(index).click();
  }

  // Search/Filter
  getSearchInput(): Locator {
    return this.getSection().locator("input[type='text']");
  }

  async searchLiterature(searchTerm: string): Promise<void> {
    await this.getSearchInput().fill(searchTerm);
  }

  // Pagination
  getNextPageButton(): Locator {
    return this.getSection().locator("button[aria-label='Go to next page']");
  }

  getPreviousPageButton(): Locator {
    return this.getSection().locator("button[aria-label='Go to previous page']");
  }

  async clickNextPage(): Promise<void> {
    await this.getNextPageButton().click();
  }

  async clickPreviousPage(): Promise<void> {
    await this.getPreviousPageButton().click();
  }

  // Wait for section to load
  async waitForSectionLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible" });
    await this.page.waitForTimeout(500);
  }
}
