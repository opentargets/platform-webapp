import { expect, type Locator, type Page } from "@playwright/test";
import { waitForOperation } from "../shared/sectionDataControls";
import {
  EVIDENCE_PAGE_SIZE,
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";

/** BRAF in melanoma: one Project Score row, 50 melanoma cell lines. */
export const BRAF_MELANOMA_CRISPR: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000157764",
  efoId: "MONDO_0005105",
  symbol: "BRAF",
  name: "melanoma",
};
/** PIK3CA in carcinoma: one Project Score row per carcinoma type, each with its own cell lines. */
export const PIK3CA_CARCINOMA: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000121879",
  efoId: "MONDO_0004993",
  symbol: "PIK3CA",
  name: "carcinoma",
};

export const CRISPR_HEADERS = [
  "Disease/phenotype",
  "Reported disease/phenotype",
  "Priority score",
] as const;
export const CRISPR_COLUMN = { disease: 0, cellLines: 1, score: 2 } as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/CRISPR). */
export const CRISPR_OPERATION = "CrisprQuery";
export const CRISPR_LIST = "crisprSummary";

export type CrisprRow = {
  disease: { id: string; name: string };
  diseaseCellLines: { id: string; name: string }[] | null;
  diseaseFromSource: string | null;
  resourceScore: number;
  literature: string[] | null;
};

/** Where a cell line is described. */
export const cellLineUrl = (id: string): string =>
  `https://cellmodelpassports.sanger.ac.uk/passports/${id}`;

/** Evidence page > Project Score (section id "crispr"). */
export class CrisprSection extends GeneticEvidenceSection {
  static readonly id = "crispr";

  constructor(page: Page) {
    super(page, CrisprSection.id);
  }

  override get chip(): Locator {
    return this.section.getByText("Pathways & systems biology", { exact: true });
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, CRISPR_COLUMN.disease).getByRole("link");
  }

  /** The "<n> <disease> cell lines" button of a row. */
  cellLinesButton(row: number): Locator {
    return this.cell(row, CRISPR_COLUMN.cellLines).getByTestId("table-drawer");
  }

  /** The drawer that lists the cell lines, which is rendered in a portal outside the section. */
  get cellLinesDrawer(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }

  /** Open the cell lines of a row and assert the drawer lists exactly them, each linked to its passport. */
  async expectCellLines(row: number, expected: { id: string; name: string }[]): Promise<void> {
    await this.cellLinesButton(row).click();
    const drawer = this.cellLinesDrawer;
    await expect(drawer, "the cell lines drawer should open").toBeVisible();
    await expect(drawer.getByText("Records", { exact: true }).first()).toBeVisible();
    await expect(drawer.getByText("Cancer Cell Lines", { exact: true })).toBeVisible();
    await expect(drawer.getByText(`${expected.length} Records`, { exact: true })).toBeVisible();
    const links = drawer.getByRole("link");
    await expect(links).toHaveText(expected.map((line) => line.name));
    for (const [index, line] of expected.entries()) {
      await expect(links.nth(index)).toHaveAttribute("href", cellLineUrl(line.id));
    }
  }

  async closeDrawer(): Promise<void> {
    await this.cellLinesDrawer.getByTestId("drawer-close").click();
    await expect(this.cellLinesDrawer, "the cell lines drawer should close").toBeHidden();
  }
}

/** Open an evidence page and wait for the Project Score section and its first page. */
export async function openCrispr(
  page: Page,
  pair: EvidencePair = BRAF_MELANOMA_CRISPR
): Promise<{ section: CrisprSection; list: EvidenceList<CrisprRow> }> {
  const section = new CrisprSection(page);
  const response = waitForOperation<{ disease: Record<string, EvidenceList<CrisprRow>> }>(
    page,
    CRISPR_OPERATION
  );
  await page.goto(`/evidence/${pair.ensgId}/${pair.efoId}`);
  const { data, variables } = await response;
  expect(variables, "the section asks for the first page of its target and disease").toMatchObject({
    ensemblId: pair.ensgId,
    efoId: pair.efoId,
    index: 0,
    size: EVIDENCE_PAGE_SIZE,
  });
  await section.expectLoaded();
  const list = data.disease[CRISPR_LIST];
  expect(list.count, "the API has Project Score evidence for this pair").toBeGreaterThan(0);
  expect(list.rows.length).toBe(Math.min(list.count, EVIDENCE_PAGE_SIZE));
  return { section, list };
}
