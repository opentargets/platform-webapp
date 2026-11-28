import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "./sectionDataControls";

/** Columns of the ClinVar table, in order. */
export const EVA_HEADERS = [
  "Disease/phenotype",
  "ClinVar ID",
  "Clinical significance",
  "Allele origin",
  "Review status",
  "Literature",
] as const;

export const EVA_COLUMN = {
  disease: 0,
  clinvarId: 1,
  significance: 2,
  alleleOrigin: 3,
  reviewStatus: 4,
  literature: 5,
} as const;

/** GraphQL operation behind the section (packages/sections/src/variant/EVA). */
export const EVA_OPERATION = "EVAQuery";
export const EVA_PAGE_SIZE = 10;

/**
 * Variant page > ClinVar (section id "eva"): a server-paginated table of ClinVar
 * submissions linking the variant to diseases. No search box.
 */
export class EVASection {
  static readonly id = "eva";
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, EVASection.id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-eva-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The disease link of a row. */
  diseaseLink(row: number): Locator {
    return this.table.cell(row, EVA_COLUMN.disease).getByRole("link");
  }

  /** The ClinVar record link of a row. */
  clinvarLink(row: number): Locator {
    return this.table.cell(row, EVA_COLUMN.clinvarId).getByRole("link");
  }

  /** The "?" help icon of a cell, which carries a tooltip. */
  helpIcon(row: number, column: keyof typeof EVA_COLUMN): Locator {
    return this.table.cell(row, EVA_COLUMN[column]).locator("sup");
  }

  /** The star icons of a row's review status: filled ones are solid (fa-solid). */
  stars(row: number): Locator {
    return this.table.cell(row, EVA_COLUMN.reviewStatus).locator("svg");
  }

  filledStars(row: number): Locator {
    return this.table.cell(row, EVA_COLUMN.reviewStatus).locator("svg[data-prefix='fas']");
  }

  literatureTrigger(row: number): Locator {
    return this.table.cell(row, EVA_COLUMN.literature).getByTestId("publications-drawer-trigger");
  }

  /** Choose a rows-per-page value and assert the select shows it. */
  async setPageSize(size: number): Promise<void> {
    await this.table.pageSizeSelect.selectOption(String(size));
    await expect(this.table.pageSizeSelect).toHaveValue(String(size));
  }
}
