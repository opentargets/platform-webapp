import type { Locator, Page } from "@playwright/test";
import { WIDGET_LOAD_TIMEOUT } from "../../../../utils/timeouts";

export class SharedTraitStudiesSection {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Section container
  getSection(): Locator {
    return this.page.locator("[data-testid='section-shared-trait-studies']");
  }

  async isSectionVisible(): Promise<boolean> {
    return await this.getSection()
      .isVisible()
      .catch(() => false);
  }

  // Section header
  getSectionHeader(): Locator {
    return this.page.locator("[data-testid='section-shared-trait-studies-header']");
  }

  async getSectionTitle(): Promise<string | null> {
    return await this.getSectionHeader().textContent();
  }

  // Table
  getTable(): Locator {
    return this.getSection().locator("table");
  }

  async isTableVisible(): Promise<boolean> {
    return await this.getTable()
      .isVisible()
      .catch(() => false);
  }

  getTableRows(): Locator {
    return this.getTable().locator("tbody tr");
  }

  async getRowCount(): Promise<number> {
    return await this.getTableRows().count();
  }

  // Get cell data
  getCell(rowIndex: number, columnIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).locator("td").nth(columnIndex);
  }

  async getCellText(rowIndex: number, columnIndex: number): Promise<string | null> {
    return await this.getCell(rowIndex, columnIndex).textContent();
  }

  // Get study link
  getStudyLink(rowIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).locator("a[href*='/study/']");
  }

  async clickStudyLink(rowIndex: number): Promise<void> {
    await this.getStudyLink(rowIndex).click();
  }

  async getStudyId(rowIndex: number): Promise<string | null> {
    return await this.getStudyLink(rowIndex).textContent();
  }

  // Get disease link
  getDiseaseLink(rowIndex: number): Locator {
    return this.getTableRows().nth(rowIndex).locator("a[href*='/disease/']");
  }

  async clickDiseaseLink(rowIndex: number): Promise<void> {
    await this.getDiseaseLink(rowIndex).click();
  }

  async getDiseaseName(rowIndex: number): Promise<string | null> {
    return await this.getDiseaseLink(rowIndex).textContent();
  }

  // Search/Filter
  getSearchInput(): Locator {
    return this.getSection().locator("input[type='text']");
  }

  async searchStudy(searchTerm: string): Promise<void> {
    await this.getSearchInput().fill(searchTerm);
  }

  // Pagination
  getNextPageButton(): Locator {
    return this.getSection().locator("[data-testid='pagination-next-button']");
  }

  getPreviousPageButton(): Locator {
    return this.getSection().locator("[data-testid='pagination-previous-button']");
  }

  async clickNextPage(): Promise<void> {
    await this.getNextPageButton().click();
  }

  async clickPreviousPage(): Promise<void> {
    await this.getPreviousPageButton().click();
  }

  async isNextPageEnabled(): Promise<boolean> {
    return await this.getNextPageButton().isEnabled();
  }

  async isPreviousPageEnabled(): Promise<boolean> {
    return await this.getPreviousPageButton().isEnabled();
  }

  // Wait for section to load
  async waitForSectionLoad(): Promise<void> {
    await this.getSection().waitFor({ state: "visible", timeout: WIDGET_LOAD_TIMEOUT });
    await this.page.waitForTimeout(500);
  }
}
