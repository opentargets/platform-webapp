import { expect, type Locator, type Page } from "@playwright/test";
import { PublicationsDrawer } from "./publicationsDrawer";
import { ProfileSection, TableControls } from "./sectionWidgets";

/**
 * Column headers of the target pharmacogenetics table, in order. "Genotype ID" and
 * "Confidence Level" carry a "?" help icon after the label.
 */
export const TARGET_PGX_COLUMNS = [
  "rsID",
  "Star Allele",
  /^Genotype ID\s*\?$/,
  "Variant Consequence",
  "Drug(s)",
  "Drug Response Phenotype",
  "Drug Response Category",
  "Directionality",
  "Direct Drug Target",
  /^Confidence Level\s*\?$/,
  "Source",
  "Literature",
] as const;

export const TARGET_PGX_COLUMN = {
  rsId: 0,
  starAllele: 1,
  genotypeId: 2,
  consequence: 3,
  drugs: 4,
  phenotype: 5,
  category: 6,
  directionality: 7,
  directTarget: 8,
  confidence: 9,
  source: 10,
  literature: 11,
} as const;

/** PharmGKB/ClinPGx clinical annotation levels, from strongest to weakest evidence. */
export const PGX_EVIDENCE_LEVELS = ["1A", "1B", "2A", "2B", "3", "4"] as const;

/** GraphQL operation behind the section (packages/sections/src/target/Pharmacogenomics). */
export const TARGET_PGX_OPERATION = "TargetPharmacogenomicsQuery";

/**
 * Target profile > Pharmacogenetics: a server-backed table sorted by confidence level.
 * The API has no sort or search input for it, so the table downloads every row to sort
 * and to search, and paginates the result itself.
 */
export class TargetPharmacogenomicsSection extends ProfileSection {
  readonly table: TableControls;
  readonly publicationsDrawer: PublicationsDrawer;

  constructor(page: Page) {
    super(page, "pharmacogenetics");
    this.table = new TableControls(page, this.section);
    this.publicationsDrawer = new PublicationsDrawer(page);
  }

  cell(row: number, column: keyof typeof TARGET_PGX_COLUMN): Locator {
    return this.table.rows.nth(row).locator("td").nth(TARGET_PGX_COLUMN[column]);
  }

  /** Every cell of one column on the current page. */
  column(column: keyof typeof TARGET_PGX_COLUMN): Locator {
    return this.table.rows.locator(`td:nth-child(${TARGET_PGX_COLUMN[column] + 1})`);
  }

  header(column: keyof typeof TARGET_PGX_COLUMN): Locator {
    return this.table.headers.nth(TARGET_PGX_COLUMN[column]);
  }

  /** The trimmed text of one column for the rows on the current page. */
  async columnTexts(column: keyof typeof TARGET_PGX_COLUMN): Promise<string[]> {
    return (await this.column(column).allInnerTexts()).map((text) => text.replace(/\s+/g, " ").trim());
  }

  get directionalityDrawer(): Locator {
    return this.page.getByTestId("directionality-drawer");
  }

  /** The "N publications" / PubMed id buttons of the Literature column on the current page. */
  get literatureTriggers(): Locator {
    return this.column("literature").getByTestId("publications-drawer-trigger");
  }

  async closeDirectionalityDrawer(): Promise<void> {
    await this.directionalityDrawer.getByTestId("drawer-close").click();
    await expect(this.directionalityDrawer, "the directionality drawer should close").toBeHidden();
  }
}
