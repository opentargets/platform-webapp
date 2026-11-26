import { expect, type Locator, type Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator, sectionTestId } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "../shared/sectionDataControls";
import { PublicationsDrawer } from "../Target/publicationsDrawer";

/** Rows per page of every server-paginated evidence table. */
export const EVIDENCE_PAGE_SIZE = 10;

export type EvidencePair = { ensgId: string; efoId: string };

/** MECP2 in neurodevelopmental disorder: all six curated genetic sources, several rows each. */
export const MECP2_NDD: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000169057",
  efoId: "MONDO_0700092",
  symbol: "MECP2",
  name: "neurodevelopmental disorder",
};
/** NF1 in neurofibromatosis type 1: all six sources, with several pages of Genomics England and UniProt variants. */
export const NF1_NF1: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000196712",
  efoId: "MONDO_0018975",
  symbol: "NF1",
  name: "neurofibromatosis type 1",
};
/** CFTR in cystic fibrosis: every source of this group except Gene2Phenotype. */
export const CFTR_CF: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000001626",
  efoId: "MONDO_0009061",
  symbol: "CFTR",
  name: "cystic fibrosis",
};
/** MECP2 in syndromic X-linked intellectual disability, Lubs type: only Genomics England, Gene2Phenotype and UniProt literature. */
export const MECP2_LUBS: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000169057",
  efoId: "MONDO_0010283",
  symbol: "MECP2",
  name: "syndromic X-linked intellectual disability Lubs type",
};
/** PCSK9 in LDL cholesterol measurement: genetic evidence only from gene burden and GWAS. */
export const PCSK9_LDL: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000169174",
  efoId: "EFO_0004611",
  symbol: "PCSK9",
  name: "low density lipoprotein cholesterol measurement",
};

export type EvidenceList<Row> = { count: number; rows: Row[] };

export const sentence = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ").toLowerCase();

/**
 * A server-paginated genetic evidence section of the evidence page: a table of the evidence
 * rows between the target and the disease, with no search box and no sorting.
 */
export class GeneticEvidenceSection {
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;
  readonly drawer: PublicationsDrawer;

  constructor(
    readonly page: Page,
    /** the section definition id, e.g. "genomics_england" */
    readonly id: string
  ) {
    this.section = sectionLocator(page, id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
    this.drawer = new PublicationsDrawer(page);
  }

  /** Assert the section is loaded and its table shows rows. */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, this.id);
    await expect(this.table.table, "the section should show its table").toBeVisible();
    await expect(this.table.rows.first(), "the table should have rows").toBeVisible();
  }

  get title(): Locator {
    return this.section.getByTestId(`${sectionTestId(this.id)}-header`);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The data type chip next to the title. */
  get chip(): Locator {
    return this.section.getByText("Genetic associations", { exact: true });
  }

  cell(row: number, column: number): Locator {
    return this.table.cell(row, column);
  }

  /** The "?" help icon of a cell, which carries a tooltip. */
  helpIcon(row: number, column: number): Locator {
    return this.cell(row, column).locator("sup");
  }

  /** The tooltip currently shown. */
  get tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }

  literatureTrigger(row: number, column: number): Locator {
    return this.cell(row, column).getByTestId("publications-drawer-trigger");
  }

  /** Hover a cell's help icon and return the tooltip it opens. */
  async openHelp(row: number, column: number): Promise<Locator> {
    await this.page.mouse.move(0, 0);
    await expect(this.tooltip, "an earlier tooltip should close").toHaveCount(0);
    await this.helpIcon(row, column).hover();
    await expect(this.tooltip, "the help icon should open a tooltip").toBeVisible();
    return this.tooltip;
  }

  /** The text a literature cell shows for a list of publication ids. */
  static literatureLabel(ids: readonly string[] | null): string {
    const cited = (ids ?? []).filter((id) => id !== "NA");
    if (cited.length === 0) return "N/A";
    return cited.length === 1 ? cited[0] : `${cited.length} publications`;
  }

  /**
   * Assert a literature cell shows its label and that opening it lists the publications of
   * that row (Europe PMC is stubbed by the caller), then close the drawer.
   */
  async expectLiteratureDrawer(row: number, column: number, ids: readonly string[]): Promise<void> {
    const cited = ids.filter((id) => id !== "NA");
    await expect(this.literatureTrigger(row, column)).toHaveText(
      GeneticEvidenceSection.literatureLabel(cited)
    );
    await this.literatureTrigger(row, column).click();
    await this.drawer.expectOpen();
    const shown = cited.slice(0, EVIDENCE_PAGE_SIZE);
    await expect(this.drawer.entries).toHaveCount(shown.length);
    for (const id of shown) await expect(this.drawer.entry(id)).toBeVisible();
    await this.drawer.close();
  }
}
