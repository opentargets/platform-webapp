import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "./sectionDataControls";

/** Columns of the UniProt variants table, in order. */
export const UNIPROT_HEADERS = ["Disease/phenotype", "Confidence", "Literature"] as const;

export const UNIPROT_COLUMN = { disease: 0, confidence: 1, literature: 2 } as const;

/** GraphQL operation behind the section (packages/sections/src/variant/UniProtVariants). */
export const UNIPROT_OPERATION = "UniProtVariantsQuery";

/**
 * Variant page > UniProt variants (section id "uniprot_variants", test id
 * "section-uniprot-variants"): a server-paginated table of literature-curated
 * variant-disease associations. No search box.
 */
export class UniProtVariantsSection {
  static readonly id = "uniprot-variants";
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, UniProtVariantsSection.id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-uniprot-variants-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  diseaseLink(row: number): Locator {
    return this.table.cell(row, UNIPROT_COLUMN.disease).getByRole("link");
  }

  helpIcon(row: number): Locator {
    return this.table.cell(row, UNIPROT_COLUMN.disease).locator("sup");
  }

  literatureTrigger(row: number): Locator {
    return this.table
      .cell(row, UNIPROT_COLUMN.literature)
      .getByTestId("publications-drawer-trigger");
  }
}
