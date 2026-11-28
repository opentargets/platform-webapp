import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The header of a molQTL study page: the title bar (id and source link) and the
 * profile header block (type, project, affected gene, tissue, condition, sample size ...).
 */
export class QTLStudyHeader {
  constructor(readonly page: Page) {}

  async goto(studyId: string): Promise<void> {
    await this.page.goto(`/study/${studyId}`);
    await expect(this.title).toBeVisible();
    await expect(this.profile).toBeVisible();
    await expect(this.studyType).toBeVisible();
  }

  get title(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  get titleBlock(): Locator {
    return this.page.getByTestId("profile-page-header-block");
  }

  /** The "Source" link in the title bar. */
  get sourceLink(): Locator {
    return this.titleBlock.getByTestId("external-links").getByRole("link");
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile" });
  }

  get profile(): Locator {
    return this.page.getByTestId("profile-header");
  }

  field(name: string): Locator {
    return this.profile.getByTestId(`field-${name}`);
  }

  get studyType(): Locator {
    return this.field("study-type");
  }
  get project(): Locator {
    return this.field("project");
  }
  get affectedGene(): Locator {
    return this.field("affected-gene");
  }
  get affectedCellTissue(): Locator {
    return this.field("affected-cell-tissue");
  }
  get condition(): Locator {
    return this.field("condition");
  }
  get publication(): Locator {
    return this.field("publication");
  }
  get pubmed(): Locator {
    return this.field("pubmed");
  }
  get summaryStatistics(): Locator {
    return this.field("summary-statistics");
  }
  get sampleSize(): Locator {
    return this.field("sample-size");
  }
  get qcWarnings(): Locator {
    return this.profile.getByTestId("field-qc-warnings");
  }
  get populationChips(): Locator {
    return this.profile.locator("[data-testid^='chip-ld-population-']");
  }

  /** Fields that only exist on GWAS studies. */
  get gwasOnlyFields(): Locator {
    return this.profile.locator(
      "[data-testid='field-reported-trait'], [data-testid='field-disease-or-phenotype'], [data-testid='field-background-trait'], [data-testid='field-n-cases'], [data-testid='field-n-controls']"
    );
  }

  /** Open the QC warnings popover, return its content. */
  async openQcWarnings(): Promise<Locator> {
    await this.qcWarnings.getByTestId("detail-popover-trigger").click();
    const content = this.page.getByTestId("detail-popover-content");
    await expect(content).toBeVisible();
    return content;
  }
}
