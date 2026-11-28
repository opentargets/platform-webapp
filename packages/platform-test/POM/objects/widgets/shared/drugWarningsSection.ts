import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionTable } from "../Drug/sectionTable";

export const DRUG_WARNINGS_COLUMNS = [
  "Warning type",
  "Adverse event",
  "ChEMBL warning class",
  "Country / region",
  "Year",
  "References",
] as const;

/** Column positions in the drug warnings table. */
export const WARNING_COLUMN = {
  type: 0,
  adverseEvent: 1,
  warningClass: 2,
  country: 3,
  year: 4,
  references: 5,
} as const;

/** Drug page: Drug Warnings section (a server-paginated table). */
export class DrugWarningsSection {
  static readonly id = "drugwarnings";
  readonly section: Locator;
  readonly table: SectionTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, DrugWarningsSection.id);
    this.table = new SectionTable(this.section);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** Links in the "ChEMBL warning class" column, one per row that has a class. */
  get warningClassLinks(): Locator {
    return this.table.rows
      .locator(`td:nth-child(${WARNING_COLUMN.warningClass + 1})`)
      .getByRole("link");
  }

  /** Links in the "Adverse event" column, one per row that names an event. */
  get adverseEventLinks(): Locator {
    return this.table.rows
      .locator(`td:nth-child(${WARNING_COLUMN.adverseEvent + 1})`)
      .getByRole("link");
  }

  /** The buttons that open the references of a row ("DailyMed, FDA"). */
  get referenceButtons(): Locator {
    return this.table.rows.getByTestId("table-drawer");
  }

  /** The drawer listing the references of a row, grouped by source. */
  get referencesDrawer(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }
}
