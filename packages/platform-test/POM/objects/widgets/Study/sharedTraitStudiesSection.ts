import type { Locator, Page } from "@playwright/test";
import { sectionLocator, sectionTestId } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

/** Column positions of the shared trait studies table. */
export const SHARED_COLUMNS = {
  study: 0,
  sharedDisease: 1,
  reportedTrait: 2,
  sampleSize: 3,
  cohorts: 4,
  publication: 5,
} as const;

/** The "Shared Trait Studies" section of a GWAS study page (server-side table). */
export class SharedTraitStudiesSection {
  static readonly id = "shared-trait-studies";
  readonly section: Locator;
  readonly table: OtTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, SharedTraitStudiesSection.id);
    this.table = new OtTable(this.section);
  }

  get title(): Locator {
    return this.page.getByTestId(`${sectionTestId(SharedTraitStudiesSection.id)}-header`);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The cell of one column in one row. */
  cell(row: number, column: keyof typeof SHARED_COLUMNS): Locator {
    return this.table.cell(row, SHARED_COLUMNS[column]);
  }

  studyLink(row: number): Locator {
    return this.cell(row, "study").getByRole("link");
  }

  diseaseLinks(row: number): Locator {
    return this.cell(row, "sharedDisease").getByRole("link");
  }

  publicationTrigger(row: number): Locator {
    return this.cell(row, "publication").getByTestId("publications-drawer-trigger");
  }

  /** The study ids on the current page, in order. */
  async studyIds(): Promise<string[]> {
    return this.table.columnTexts(SHARED_COLUMNS.study);
  }

  /** The sample sizes on the current page, in order, as numbers. */
  async sampleSizes(): Promise<number[]> {
    return (await this.table.columnTexts(SHARED_COLUMNS.sampleSize)).map((text) =>
      Number(text.replace(/,/g, ""))
    );
  }
}
