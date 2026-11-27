import type { Locator, Page } from "@playwright/test";
import { openEvidenceSection } from "./geneticEvidenceChecks";
import {
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";

/** FGFR3 in cancer or benign tumor: 22 Expression Atlas experiments, three pages. */
export const FGFR3_NEOPLASM_EA: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000068078",
  efoId: "MONDO_0045024",
  symbol: "FGFR3",
  name: "cancer or benign tumor",
};
/** HRAS in cancer or benign tumor: a single experiment. */
export const HRAS_NEOPLASM: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000174775",
  efoId: "MONDO_0045024",
  symbol: "HRAS",
  name: "cancer or benign tumor",
};

/** Columns of the Expression Atlas table, in order. */
export const EA_HEADERS = [
  "Disease/phenotype",
  "Experiment ID",
  "Experiment details",
  "Experiment confidence",
  "Percentile",
  "p-value",
] as const;
export const EA_COLUMN = {
  disease: 0,
  experiment: 1,
  details: 2,
  confidence: 3,
  percentile: 4,
  pValue: 5,
} as const;
/** The picker lists every column; only the experiment id is locked. */
export const EA_LOCKED = ["Experiment ID"] as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/ExpressionAtlas). */
export const EA_OPERATION = "ExpressionAtlasQuery";
export const EA_LIST = "expressionAtlasSummary";

export type ExpressionAtlasRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string | null;
  contrast: string;
  confidence: string;
  studyOverview: string | null;
  resourceScore: number | null;
  log2FoldChangePercentileRank: number | null;
  studyId: string;
};

/** A p-value the way ScientificNotation prints it: 4.89e-17 is "4.890×10-17". */
export function scientific(value: number): string {
  const [mantissa, exponent] = value.toExponential().split("e");
  const power = exponent.startsWith("+") ? exponent.slice(1) : exponent;
  return `${Number(mantissa).toFixed(3)}×10${power}`;
}

/** Evidence page > Expression Atlas (section id "expression_atlas"). */
export class ExpressionAtlasSection extends GeneticEvidenceSection {
  static readonly id = "expression_atlas";

  constructor(page: Page) {
    super(page, ExpressionAtlasSection.id);
  }

  override get chip(): Locator {
    return this.section.getByText("RNA expression", { exact: true });
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, EA_COLUMN.disease).getByRole("link");
  }

  experimentLink(row: number): Locator {
    return this.cell(row, EA_COLUMN.experiment).getByRole("link");
  }
}

/** Open an evidence page and wait for the Expression Atlas section and its first page. */
export async function openExpressionAtlas(
  page: Page,
  pair: EvidencePair = FGFR3_NEOPLASM_EA
): Promise<{ section: ExpressionAtlasSection; list: EvidenceList<ExpressionAtlasRow> }> {
  const section = new ExpressionAtlasSection(page);
  const list = await openEvidenceSection<ExpressionAtlasRow>(
    page,
    section,
    EA_OPERATION,
    EA_LIST,
    pair
  );
  return { section, list };
}
