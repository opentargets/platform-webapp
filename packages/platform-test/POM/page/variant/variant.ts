import { expect, type Locator, type Page } from "@playwright/test";
import { sectionTestId } from "../../../utils/sections";

/** The variant profile page, /variant/:varId. */
export class VariantPage {
  page: Page;
  originalURL: string;

  constructor(page: Page) {
    this.page = page;
    this.originalURL = page.url();
  }

  /**
   * Open a variant page and wait for its header to show the variant id.
   * @param variantId - Variant ID in format: chromosome_position_ref_alt (e.g., "1_154453788_C_T")
   */
  async goToVariantPage(variantId: string): Promise<void> {
    await this.page.goto(`/variant/${variantId}`);
    await this.waitForVariantPageLoad();
  }

  /** Wait until the header block shows a title and the profile header has its data. */
  async waitForVariantPageLoad(): Promise<void> {
    await expect(this.headerBlock).toBeVisible();
    await expect(this.title, "the variant header should show the variant id").not.toBeEmpty();
    await expect(this.page.getByTestId("profile-header")).toBeVisible();
  }

  get headerBlock(): Locator {
    return this.page.getByTestId("profile-page-header-block");
  }

  /** The variant id (or its DEL / INS short form) in the page header. */
  get title(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  /** Alias kept for existing specs: the header title locator. */
  getVariantIdFromHeader(): Locator {
    return this.title;
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile" });
  }

  get notFound(): Locator {
    return this.page.getByTestId("not-found-page");
  }

  /** The external link group of a cross reference, e.g. "Ensembl", in the header. */
  crossReferences(label: string): Locator {
    return this.page.getByTestId(`header-external-links-${label.toLowerCase()}`);
  }

  get allCrossReferenceGroups(): Locator {
    return this.page.locator("[data-testid^='header-external-links-']");
  }

  /** Assert the browser is on this variant's page. */
  async expectOnVariantPage(variantId?: string): Promise<void> {
    await expect(this.page).toHaveURL(
      variantId ? new RegExp(`/variant/${variantId}(\\?.*)?(#.*)?$`) : /\/variant\/[^/]+/
    );
  }

  section(sectionId: string): Locator {
    return this.page.getByTestId(sectionTestId(sectionId));
  }

  /** Wait for a section to be visible and to have finished loading. */
  async waitForSectionToLoad(sectionTestIdValue: string): Promise<void> {
    const section = this.page.getByTestId(sectionTestIdValue);
    await expect(section).toBeVisible();
    await expect(section.locator(".MuiSkeleton-root")).toHaveCount(0);
  }
}
