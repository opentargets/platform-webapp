import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "./sectionDataControls";

/** Columns of the pharmacogenetics table, in order. */
export const PGX_HEADERS = [
  "Genotype ID?",
  "Drug(s)",
  "Drug response phenotype",
  "Drug response category",
  "Gene",
  "Directionality",
  "Direct drug target",
  "Confidence level?",
  "Source",
  "Literature",
] as const;

export const PGX_COLUMN = {
  genotype: 0,
  drugs: 1,
  phenotype: 2,
  category: 3,
  gene: 4,
  directionality: 5,
  directTarget: 6,
  level: 7,
  source: 8,
  literature: 9,
} as const;

/** GraphQL operation behind the section (packages/sections/src/variant/Pharmacogenomics). */
export const PGX_OPERATION = "PharmacogenomicsQuery";
export const PGX_PAGE_SIZE = 10;

/**
 * Variant page > Pharmacogenetics (section id "pharmacogenetics"): a server-side table
 * (pagination, search, sort by confidence level).
 */
export class PharmacogenomicsSection {
  static readonly id = "pharmacogenetics";
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, PharmacogenomicsSection.id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-pharmacogenetics-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  drugLinks(row: number): Locator {
    return this.table.cell(row, PGX_COLUMN.drugs).getByRole("link");
  }

  geneLink(row: number): Locator {
    return this.table.cell(row, PGX_COLUMN.gene).getByRole("link");
  }

  sourceLink(row: number): Locator {
    return this.table.cell(row, PGX_COLUMN.source).getByRole("link");
  }

  /** The "Level 2B" badge of a row. */
  level(row: number): Locator {
    return this.table.cell(row, PGX_COLUMN.level);
  }

  /** The title of a column header: clicking it sorts the column. A help icon may follow the text. */
  sortLabel(header: string): Locator {
    return this.table.headers
      .filter({ hasText: header })
      .getByText(new RegExp(`^${header.replace(/[()]/g, "\\$&")}\\??$`));
  }

  /** The arrow of an unsorted, sortable column (shown on hover) and of the sorted one. */
  sortArrows(header: string): Locator {
    return this.table.headers.filter({ hasText: header }).locator("svg[data-icon^='arrow-']");
  }
}
