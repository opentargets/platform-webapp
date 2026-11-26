import { expect, type Locator, type Page } from "@playwright/test";
import { ProfileSection, TableControls } from "../Target/sectionWidgets";

/** Gene Ontology section of the target profile: GO annotations with evidence and source. */
export class GeneOntologySection extends ProfileSection {
  static readonly COLUMNS = ["Category", "GO term", "Gene product", "Evidence code", "Source"];
  /** The three GO aspects, in the order the table sorts them. */
  static readonly CATEGORIES = ["Biological Process", "Cellular Component", "Molecular Function"];

  readonly controls: TableControls;

  constructor(page: Page) {
    super(page, "geneontology");
    this.controls = new TableControls(page, this.section);
  }

  category(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 0);
  }

  /** The GO term label, linking to the term on identifiers.org. */
  termLink(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 1).getByRole("link");
  }

  /** The annotated gene product, linking to its annotations for this term in QuickGO. */
  geneProductLink(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 2).getByRole("link");
  }

  evidenceCell(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 3);
  }

  /** The "?" next to an evidence code; hovering it explains the code. */
  evidenceHelp(rowIndex: number): Locator {
    return this.evidenceCell(rowIndex).locator("sup");
  }

  sourceCell(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 4);
  }

  /** Rows whose source is a publication: the cell is a button that opens the publications drawer. */
  get rowsWithPublication(): Locator {
    return this.controls.rows.filter({ has: this.page.locator("td:nth-child(5) button") });
  }

  get publicationsDrawer(): Locator {
    return this.page.getByTestId("publications-drawer");
  }

  /** The evidence code of a row, without the help marker. */
  async evidenceCode(rowIndex: number): Promise<string> {
    await expect(this.evidenceCell(rowIndex)).toHaveText(/^[A-Z]{2,3}\?$/);
    return (await this.evidenceCell(rowIndex).innerText()).replace("?", "").trim();
  }

  /** The Category value of every row on the current page. */
  async categories(): Promise<string[]> {
    return this.controls.table.columnTexts(0);
  }
}
