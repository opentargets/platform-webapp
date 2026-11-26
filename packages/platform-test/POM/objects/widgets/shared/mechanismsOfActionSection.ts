import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionTable } from "../Drug/sectionTable";

export const MECHANISMS_OF_ACTION_COLUMNS = [
  "Mechanism of Action",
  "Target Name",
  "Human targets",
  "References",
] as const;

/** Column positions in the mechanisms of action table. */
export const MOA_COLUMN = { mechanism: 0, targetName: 1, targets: 2, references: 3 } as const;

/** Drug page: Mechanisms of Action section (a client-side table). */
export class MechanismsOfActionSection {
  static readonly id = "mechanismsofaction";
  readonly section: Locator;
  readonly table: SectionTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, MechanismsOfActionSection.id);
    this.table = new SectionTable(this.section);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** Links to the human targets of one row. */
  targetLinks(rowIndex: number): Locator {
    return this.table.cell(rowIndex, MOA_COLUMN.targets).getByRole("link");
  }

  /** The "N entries" button a row shows when it has several human targets. */
  targetsDrawerButton(rowIndex: number): Locator {
    return this.table.cell(rowIndex, MOA_COLUMN.targets).getByTestId("table-drawer");
  }

  referenceLinks(rowIndex: number): Locator {
    return this.table.cell(rowIndex, MOA_COLUMN.references).getByRole("link");
  }

  /** The drawer listing every target of a row. */
  get targetsDrawer(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }
}
