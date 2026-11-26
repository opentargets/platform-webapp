import type { Locator, Page } from "@playwright/test";
import { PublicationsDrawer } from "../Target/publicationsDrawer";
import { ProfileSection, TableControls } from "../Target/sectionWidgets";

/** Column headers of the hallmarks table, in order. */
export const CANCER_HALLMARKS_COLUMNS = ["Hallmark", "Effect", "Description", "Publications"] as const;

export const HALLMARK_COLUMN = { hallmark: 0, effect: 1, description: 2, publications: 3 } as const;

/** GraphQL operation behind the section (packages/sections/src/target/CancerHallmarks). */
export const CANCER_HALLMARKS_OPERATION = "TargetHallmarksQuery";

/**
 * Target profile > Cancer Hallmarks: the "Role in cancer" chips and the client-side
 * table of hallmarks with one publication per row.
 */
export class CancerHallmarksSection extends ProfileSection {
  readonly table: TableControls;
  readonly publicationsDrawer: PublicationsDrawer;

  constructor(page: Page) {
    super(page, "cancerHallmarks");
    this.table = new TableControls(page, this.section);
    this.publicationsDrawer = new PublicationsDrawer(page);
  }

  get roleInCancer(): Locator {
    return this.section.getByTestId("role-in-cancer");
  }

  /** One chip per "role in cancer" attribute; each links to its publication. */
  get roleInCancerChips(): Locator {
    return this.roleInCancer.locator("[data-testid^='chip-item-']");
  }

  cell(row: number, column: keyof typeof HALLMARK_COLUMN): Locator {
    return this.table.rows.nth(row).locator("td").nth(HALLMARK_COLUMN[column]);
  }

  /** Every cell of one column on the current page. */
  column(column: keyof typeof HALLMARK_COLUMN): Locator {
    return this.table.rows.locator(`td:nth-child(${HALLMARK_COLUMN[column] + 1})`);
  }

  /** The PubMed id button of a row; it opens the publications drawer. */
  publicationButton(row: number): Locator {
    return this.cell(row, "publications").getByTestId("publications-drawer-trigger");
  }
}
