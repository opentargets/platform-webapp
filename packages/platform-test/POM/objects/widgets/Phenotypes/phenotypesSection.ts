import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

export const PHENOTYPE_COLUMNS = [
  "Qualifier",
  "Phenotype",
  "Aspect",
  "Frequency",
  "Onset",
  "Modifier",
  "Sex",
  "Evidence",
  "Source",
  "References",
] as const;

export type PhenotypeColumn = (typeof PHENOTYPE_COLUMNS)[number];

/**
 * Disease page: Clinical signs and symptoms ("phenotypes") section. A server-paginated
 * table with one row per (phenotype, evidence) pair.
 */
export class PhenotypesSection {
  static readonly id = "phenotypes";
  readonly section: Locator;
  readonly table: OtTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, PhenotypesSection.id);
    this.table = new OtTable(this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-phenotypes-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The cell of a named column in a row of the current page. */
  cell(rowIndex: number, column: PhenotypeColumn): Locator {
    return this.table.cell(rowIndex, PHENOTYPE_COLUMNS.indexOf(column));
  }

  /** Every cell of a named column on the current page. */
  columnCells(column: PhenotypeColumn): Locator {
    return this.table.rows.locator(`td:nth-child(${PHENOTYPE_COLUMNS.indexOf(column) + 1})`);
  }

  /** The drawer a row's "N references" button opens. */
  get drawer(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }

  /** Close the drawer with its close button and assert it is gone. */
  async closeDrawer(): Promise<void> {
    await this.drawer.getByTestId("drawer-close").click();
    await expect(this.drawer, "the drawer should close").toBeHidden();
  }
}
