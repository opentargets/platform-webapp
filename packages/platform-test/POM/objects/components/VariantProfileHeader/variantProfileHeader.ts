import type { Locator, Page } from "@playwright/test";

/** The profile header of the variant page: description, location, alleles, VEP, frequencies. */
export class VariantProfileHeader {
  constructor(private page: Page) {}

  getProfileHeader(): Locator {
    return this.page.getByTestId("profile-header");
  }

  getVariantDescriptionField(): Locator {
    return this.page.getByTestId("profile-description");
  }

  getGRCh38LocationField(): Locator {
    return this.page.getByTestId("field-grch38-location");
  }

  getReferenceAlleleField(): Locator {
    return this.page.getByTestId("field-reference-allele");
  }

  getAlternativeAlleleField(): Locator {
    return this.page.getByTestId("field-alternative-allele");
  }

  getMostSevereConsequenceField(): Locator {
    return this.page.getByTestId("field-most-severe-consequence");
  }

  /** The external link to the Sequence Ontology term of the most severe consequence. */
  getMostSevereConsequenceLink(): Locator {
    return this.getMostSevereConsequenceField().getByRole("link");
  }

  getAlleleFrequenciesSection(): Locator {
    return this.page.getByTestId("allele-frequencies-section");
  }

  getAlleleFrequencyBars(): Locator {
    return this.getAlleleFrequenciesSection().getByTestId("allele-frequency-bar");
  }
}
