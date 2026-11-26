import type { Locator, Page } from "@playwright/test";

/** The block of fields under the title of a GWAS study page. */
export class GwasStudyHeader {
  constructor(readonly page: Page) {}

  get root(): Locator {
    return this.page.getByTestId("profile-header");
  }

  /** A `Field` of the header: its text reads "<Title>: <value>". */
  field(testId: string): Locator {
    return this.root.getByTestId(testId);
  }

  get studyType(): Locator {
    return this.field("field-study-type");
  }
  get reportedTrait(): Locator {
    return this.field("field-reported-trait");
  }
  get diseases(): Locator {
    return this.field("field-disease-or-phenotype");
  }
  get backgroundTrait(): Locator {
    return this.field("field-background-trait");
  }
  get publication(): Locator {
    return this.field("field-publication");
  }
  get pubmed(): Locator {
    return this.field("field-pubmed");
  }
  get summaryStatistics(): Locator {
    return this.field("field-summary-statistics");
  }
  get qcWarnings(): Locator {
    return this.field("field-qc-warnings");
  }
  get sampleSize(): Locator {
    return this.field("field-sample-size");
  }
  get nCases(): Locator {
    return this.field("field-n-cases");
  }
  get nControls(): Locator {
    return this.field("field-n-controls");
  }
  get analysis(): Locator {
    return this.field("field-analysis");
  }

  get ldChips(): Locator {
    return this.root.locator("[data-testid^='chip-ld-population-']");
  }

  ldChip(population: string): Locator {
    return this.root.getByTestId(`chip-ld-population-${population}`);
  }

  /** The "Available" trigger that opens the summary statistics QC table. */
  get summaryStatisticsTrigger(): Locator {
    return this.summaryStatistics.getByTestId("detail-popover-trigger");
  }

  get qcWarningsTrigger(): Locator {
    return this.qcWarnings.getByTestId("detail-popover-trigger");
  }

  /** The open popover (rendered outside the header). */
  get popover(): Locator {
    return this.page.getByTestId("detail-popover-content");
  }

  get pubmedDrawerTrigger(): Locator {
    return this.pubmed.getByTestId("publications-drawer-trigger");
  }

  get publicationsDrawer(): Locator {
    return this.page.getByTestId("publications-drawer");
  }
}
