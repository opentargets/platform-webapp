import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionTable } from "./sectionTable";

export const PHARMACOGENOMICS_COLUMNS = [
  "Gene",
  "rsID",
  "Star Allele",
  "Genotype ID",
  "Variant Consequence",
  "Drug Response Phenotype",
  "Drug Response Category",
  "Directionality",
  "Direct Drug Target",
  "Confidence Level",
  "Source",
  "Literature",
] as const;

/** Column positions in the drug pharmacogenetics table. */
export const PGX_COLUMN = {
  gene: 0,
  rsId: 1,
  starAllele: 2,
  genotypeId: 3,
  consequence: 4,
  phenotype: 5,
  category: 6,
  directionality: 7,
  directTarget: 8,
  confidence: 9,
  source: 10,
  literature: 11,
} as const;

/** Drug page: Pharmacogenetics section (server-side pagination, search and sorting). */
export class DrugPharmacogenomicsSection {
  static readonly id = "pharmacogenetics";
  readonly section: Locator;
  readonly table: SectionTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, DrugPharmacogenomicsSection.id);
    this.table = new SectionTable(this.section);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** Every cell of one column on the current page. */
  column(columnIndex: number): Locator {
    return this.table.rows.locator(`td:nth-child(${columnIndex + 1})`);
  }

  /** The buttons ("1 entry", "2 entries") that open a row's directionality drawer. */
  get directionalityButtons(): Locator {
    return this.table.rows.getByTestId("directionality-drawer-trigger");
  }

  get directionalityDrawer(): Locator {
    return this.page.getByTestId("directionality-drawer");
  }

  /** The buttons (a PubMed id or "N publications") that open a row's publications. */
  get literatureButtons(): Locator {
    return this.table.rows.getByTestId("publications-drawer-trigger");
  }

  get publicationsDrawer(): Locator {
    return this.page.getByTestId("publications-drawer");
  }

  /** The sortable "Confidence Level" header. */
  get confidenceHeader(): Locator {
    return this.table.headers.nth(PGX_COLUMN.confidence);
  }
}
