import type { Locator, Page } from "@playwright/test";

/**
 * The block under the tabs of a profile page: description, entity-specific facts and
 * synonyms. Shared by the target, disease and drug profiles.
 *
 * Use the Locator getters with web-first assertions. The methods further down that
 * return a boolean or `string | null` predate the rules in readme.md and are kept only
 * until the specs that still call them are rewritten.
 */
export class ProfileHeader {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The whole block. */
  get root(): Locator {
    return this.page.getByTestId("profile-header");
  }

  get descriptionHeading(): Locator {
    return this.root.getByRole("heading", { name: "Description", exact: true });
  }

  /** Target profile: the description paragraph (or the "No description available" placeholder). */
  get targetDescription(): Locator {
    return this.root.getByTestId("target-description");
  }

  /** Target profile: the clipped text of the description, without the show more control. */
  get targetDescriptionText(): Locator {
    return this.root.getByTestId("target-description-text");
  }

  /** Target profile: the "show more" / "hide" control of a description longer than three lines. */
  get targetDescriptionToggle(): Locator {
    return this.root.getByTestId("target-description-toggle");
  }

  /** Target profile: the "Core essential gene" chip, shown only for DepMap core essential genes. */
  get coreEssentialChip(): Locator {
    return this.root.getByText("Core essential gene", { exact: true });
  }

  /**
   * Target profile: a genomic location ("Gene body" or "Canonical transcript"), the
   * element that carries its build and coordinates chips and its tooltip.
   */
  genomicLocation(label: "Gene body" | "Canonical transcript"): Locator {
    return this.root.getByLabel(`${label}: build | chromosome:start-end,strand`);
  }

  get synonyms(): Locator {
    return this.root.getByTestId("profile-synonyms");
  }

  get synonymChips(): Locator {
    return this.synonyms.locator("[data-testid^='chip-']");
  }

  synonymChip(label: string): Locator {
    return this.synonyms.getByTestId(`chip-${label}`);
  }

  /** The "show more" / "hide" control of a synonym list longer than ten terms. */
  get synonymsToggle(): Locator {
    return this.synonyms.getByTestId("long-list-toggle");
  }

  /** The MUI tooltip currently open on the page. */
  get tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }

  // Profile header container
  getProfileHeader(): Locator {
    return this.page.locator("[data-testid='profile-header']");
  }

  async isProfileHeaderVisible(): Promise<boolean> {
    return await this.getProfileHeader()
      .isVisible()
      .catch(() => false);
  }

  // Description section - locate by the "Description" heading
  // Note: Description heading is outside the profile-header container, so search at page level
  getDescriptionHeading(): Locator {
    return this.page.getByRole("heading", { name: "Description", level: 6 });
  }

  getDescriptionSection(): Locator {
    // Get the parent container that includes both heading and description text
    return this.getDescriptionHeading().locator("..");
  }

  async isDescriptionVisible(): Promise<boolean> {
    return await this.getDescriptionHeading()
      .isVisible()
      .catch(() => false);
  }

  async getDescriptionText(): Promise<string | null> {
    // Get the paragraph element that is a sibling following the Description heading
    // Use xpath to find the paragraph sibling after the heading
    const descriptionParagraph = this.getDescriptionHeading().locator(
      "xpath=following-sibling::p[1]"
    );
    return await descriptionParagraph.textContent();
  }

  // Synonyms section
  getSynonymsSection(): Locator {
    return this.page.locator("[data-testid='profile-synonyms']");
  }

  async isSynonymsSectionVisible(): Promise<boolean> {
    return await this.getSynonymsSection()
      .isVisible()
      .catch(() => false);
  }

  getSynonymChips(): Locator {
    return this.getSynonymsSection().locator("[data-testid^='chip-']");
  }

  async getSynonymsCount(): Promise<number> {
    return await this.getSynonymChips().count();
  }

  getSynonymChip(index: number): Locator {
    return this.getSynonymChips().nth(index);
  }

  async getSynonymText(index: number): Promise<string | null> {
    return await this.getSynonymChip(index).textContent();
  }

  // Hover to see tooltip
  async hoverSynonymChip(index: number): Promise<void> {
    await this.getSynonymChip(index).hover();
  }

  // Wait for profile header to load
  async waitForProfileHeaderLoad(): Promise<void> {
    await this.page.waitForSelector("[data-testid='profile-header']", { state: "visible" });
    await this.page.waitForTimeout(500);
  }
}
