import type { Locator, Page } from "@playwright/test";
import { openEvidenceSection } from "./geneticEvidenceChecks";
import {
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";

/** KIF1A in neurodegenerative disease: 17 CRISPRBrain screens, two pages, rows mapped to three diseases. */
export const KIF1A_NDD: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000130294",
  efoId: "MONDO_0005559",
  symbol: "KIF1A",
  name: "neurodegenerative disease",
};
/** CHRM1 in Parkinson disease: a single CRISPRBrain screen. */
export const CHRM1_PD: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000168539",
  efoId: "MONDO_0005180",
  symbol: "CHRM1",
  name: "Parkinson disease",
};

/** Columns of the CRISPR Screens table, in order. */
export const CS_HEADERS = [
  "Reported disease",
  "Study Identifier",
  "Contrast / Study overview",
  "Cell type",
  "log2 fold change",
  "Significance",
  "Source",
  "Publication",
] as const;
export const CS_COLUMN = {
  disease: 0,
  study: 1,
  contrast: 2,
  cellType: 3,
  log2fc: 4,
  significance: 5,
  source: 6,
  publication: 7,
} as const;
/** The picker lists every column; only the study identifier is locked. */
export const CS_LOCKED = ["Study Identifier"] as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/CRISPRScreen). */
export const CS_OPERATION = "CrisprScreenQuery";
/** The `disease.evidenceViews` field the section reads. */
export const CS_LIST = "crisprScreen";

export type CrisprScreenRow = {
  studyId: string;
  projectId: string;
  crisprScreenLibrary: string | null;
  studyOverview: string | null;
  cellType: string | null;
  literature: string[] | null;
  diseaseFromSource: string;
  diseaseFromSourceMappedId: string;
  contrast: string | null;
  resourceScore: number | null;
  statisticalTestTail: string | null;
  phenotypicConsequenceScore: number | null;
};

/** The reported disease as the first column writes it: no "essential genes" prefix, lodash-capitalised. */
export function reportedDisease(row: CrisprScreenRow): string {
  const text = row.diseaseFromSource.toLowerCase().replace("essential genes / ", "");
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/** The log2 fold change cell: six decimals at most, N/A without a score. */
export function foldChange(row: CrisprScreenRow): string {
  return row.phenotypicConsequenceScore
    ? String(parseFloat(row.phenotypicConsequenceScore.toFixed(6)))
    : "N/A";
}

/** The significance value the cell shows (without its help icon). */
export function significance(row: CrisprScreenRow): string {
  return row.resourceScore ? String(parseFloat(row.resourceScore.toFixed(6))) : "N/A";
}

/** The overview without the final full stop, which the cell trims. */
export function overviewText(row: CrisprScreenRow): string | null {
  return row.studyOverview?.endsWith(".") ? row.studyOverview.slice(0, -1) : row.studyOverview;
}

/** Evidence page > CRISPR Screens (section id "crispr_screen"). */
export class CrisprScreenSection extends GeneticEvidenceSection {
  static readonly id = "crispr_screen";

  constructor(page: Page) {
    super(page, CrisprScreenSection.id);
  }

  override get chip(): Locator {
    return this.section.getByText("Affected pathway", { exact: true });
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, CS_COLUMN.disease).getByRole("link");
  }

  studyLink(row: number): Locator {
    return this.cell(row, CS_COLUMN.study).getByRole("link");
  }

  sourceLink(row: number): Locator {
    return this.cell(row, CS_COLUMN.source).getByRole("link");
  }

  /** The "?" icon of a cell with a tooltip: the screen library on the contrast, the test tail on the score. */
  async openContrastHelp(row: number): Promise<Locator> {
    return this.openHelp(row, CS_COLUMN.contrast);
  }
}

/** Open an evidence page and wait for the CRISPR Screens section and its first page. */
export async function openCrisprScreen(
  page: Page,
  pair: EvidencePair = KIF1A_NDD
): Promise<{ section: CrisprScreenSection; list: EvidenceList<CrisprScreenRow> }> {
  const section = new CrisprScreenSection(page);
  const list = await openEvidenceSection<CrisprScreenRow>(
    page,
    section,
    CS_OPERATION,
    CS_LIST,
    pair
  );
  return { section, list };
}
