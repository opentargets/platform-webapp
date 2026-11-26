import type { Locator, Page } from "@playwright/test";

/** Header and profile summary of the drug page: name, links, fields, chips, structure. */
export class DrugHeader {
  constructor(readonly page: Page) {}

  private get headerBlock(): Locator {
    return this.page.getByTestId("profile-page-header-block");
  }

  /** The drug name. */
  get title(): Locator {
    return this.headerBlock.getByTestId("profile-page-header-text");
  }

  /** The "ChEMBL: … | DrugBank: …" line under the name. */
  get externalLinks(): Locator {
    return this.headerBlock.getByTestId("external-links");
  }

  externalLink(id: string): Locator {
    return this.externalLinks.getByRole("link", { name: id, exact: true });
  }

  /** The block with description, fields, chips and structure. */
  get profile(): Locator {
    return this.page.getByTestId("profile-header");
  }

  get description(): Locator {
    return this.profile.getByTestId("profile-description");
  }

  get moleculeType(): Locator {
    return this.profile.getByTestId("drug-molecule-type");
  }

  get maxStage(): Locator {
    return this.profile.getByTestId("drug-max-stage");
  }

  get parentMolecule(): Locator {
    return this.profile.getByTestId("drug-parent-molecule");
  }

  get childMolecules(): Locator {
    return this.profile.getByTestId("drug-child-molecules");
  }

  get synonyms(): Locator {
    return this.profile.getByTestId("profile-synonyms");
  }

  get synonymChips(): Locator {
    return this.synonyms.locator("[data-testid^='chip-']");
  }

  /** The "[ show more ]" / "[ hide ]" control of the synonyms list. */
  get synonymsToggle(): Locator {
    return this.synonyms.getByTestId("long-list-toggle");
  }

  get tradeNames(): Locator {
    return this.profile.getByTestId("profile-known-trade-names");
  }

  get tradeNameChips(): Locator {
    return this.tradeNames.locator("[data-testid^='chip-']");
  }

  get tradeNamesToggle(): Locator {
    return this.tradeNames.getByTestId("long-list-toggle");
  }

  /** The chemical structure thumbnail; a button that opens the enlarged view. */
  get structureButton(): Locator {
    return this.profile.getByTestId("drug-structure-button");
  }

  get structureImage(): Locator {
    return this.structureButton.getByRole("img");
  }

  /** The enlarged chemical structure. */
  get structureModal(): Locator {
    return this.page.getByTestId("drug-structure-modal");
  }
}
