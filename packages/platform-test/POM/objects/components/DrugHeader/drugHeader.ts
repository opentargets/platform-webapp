import type { Locator, Page } from "@playwright/test";

/**
 * Interactor for Drug Header component
 */
export class DrugHeader {
  constructor(private page: Page) {}

  // Header container
  getHeader(): Locator {
    return this.page.locator("[data-testid='profile-page-header-block']");
  }

  async isHeaderVisible(): Promise<boolean> {
    return await this.getHeader()
      .isVisible()
      .catch(() => false);
  }

  // Drug name/title
  getDrugTitle(): Locator {
    return this.getHeader().locator("[data-testid='profile-page-header-text']");
  }

  async getDrugName(): Promise<string | null> {
    return await this.getDrugTitle().textContent();
  }

  async isDrugTitleVisible(): Promise<boolean> {
    return await this.getDrugTitle()
      .isVisible()
      .catch(() => false);
  }

  // External links section
  getExternalLinksSection(): Locator {
    return this.getHeader().locator("[data-testid='external-links']");
  }

  async hasExternalLinks(): Promise<boolean> {
    return await this.getExternalLinksSection()
      .isVisible()
      .catch(() => false);
  }

  // ChEMBL link
  getChemblLink(): Locator {
    return this.getExternalLinksSection().locator("a[href*='ebi.ac.uk/chembl']");
  }

  async hasChemblLink(): Promise<boolean> {
    return await this.getChemblLink()
      .isVisible()
      .catch(() => false);
  }

  async clickChemblLink(): Promise<void> {
    await this.getChemblLink().click();
  }

  // DrugBank link
  getDrugBankLink(): Locator {
    return this.getExternalLinksSection().locator("a[href*='drugbank']");
  }

  async hasDrugBankLink(): Promise<boolean> {
    return await this.getDrugBankLink()
      .isVisible()
      .catch(() => false);
  }

  async clickDrugBankLink(): Promise<void> {
    await this.getDrugBankLink().click();
  }

  // ChEBI link
  getChebiLink(): Locator {
    return this.getExternalLinksSection().locator("a[href*='CHEBI']");
  }

  async hasChebiLink(): Promise<boolean> {
    return await this.getChebiLink()
      .isVisible()
      .catch(() => false);
  }

  // DailyMed link
  getDailyMedLink(): Locator {
    return this.getExternalLinksSection().locator("a[href*='dailymed']");
  }

  async hasDailyMedLink(): Promise<boolean> {
    return await this.getDailyMedLink()
      .isVisible()
      .catch(() => false);
  }

  // DrugCentral link
  getDrugCentralLink(): Locator {
    return this.getExternalLinksSection().locator("a[href*='drugcentral']");
  }

  async hasDrugCentralLink(): Promise<boolean> {
    return await this.getDrugCentralLink()
      .isVisible()
      .catch(() => false);
  }

  // Wikipedia link
  getWikipediaLink(): Locator {
    return this.getExternalLinksSection().locator("a[href*='wikipedia']");
  }

  async hasWikipediaLink(): Promise<boolean> {
    return await this.getWikipediaLink()
      .isVisible()
      .catch(() => false);
  }

  // Get all external links
  getAllExternalLinks(): Locator {
    return this.getExternalLinksSection().locator("a");
  }

  async getExternalLinksCount(): Promise<number> {
    return await this.getAllExternalLinks().count();
  }

  // Wait for header to load
  async waitForHeaderLoad(): Promise<void> {
    await this.getHeader().waitFor({ state: "visible", timeout: 20000 });
  }
}
