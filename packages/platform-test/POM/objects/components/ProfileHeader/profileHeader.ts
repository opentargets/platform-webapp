import type { Locator, Page } from "@playwright/test";

/**
 * The block under the tabs of a profile page: description, entity-specific facts and
 * synonyms. Shared by the target, disease and drug profiles.
 *
 * Use the Locator getters with web-first assertions.
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
}
