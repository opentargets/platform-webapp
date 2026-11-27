import { expect, type Locator, type Page } from "@playwright/test";
import { stubEuropePmc, waitForOperation } from "../shared/sectionDataControls";
import {
  EVIDENCE_PAGE_SIZE,
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";
import { waitForPageOfOperation } from "./somaticEvidenceSection";

/**
 * GenomicsEngland, ClinGen and UniProt variants have not moved to `evidenceViews` yet:
 * their queries still alias `disease.evidences(...)` (e.g. `genomicsEngland`, `clingenSummary`).
 * The shared `openEvidenceSection` / `expectPaging` only read `disease.evidenceViews`, so these
 * two helpers do the same for the `disease.<alias>` shape. Drop them when the sections migrate.
 */
type AliasData<Row> = { disease: Record<string, EvidenceList<Row> | undefined> };

function aliasList<Row>(data: AliasData<Row>, alias: string): EvidenceList<Row> {
  const list = data.disease?.[alias];
  expect(
    list,
    `the response holds disease.${alias}; it has: ${Object.keys(data.disease ?? {}).join(", ")}`
  ).toBeDefined();
  return list as EvidenceList<Row>;
}

/** Columns of the Genomics England PanelApp table, in order. The last one has no title. */
export const GE_HEADERS = [
  "Disease/phenotype",
  "Allelic Requirement",
  "Genomics England Panel",
  "Gene rating",
  "",
] as const;
export const GE_COLUMN = {
  disease: 0,
  allelic: 1,
  panel: 2,
  rating: 3,
  literature: 4,
} as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/GenomicsEngland). */
export const GE_OPERATION = "GenomicsEnglandQuery";
export const GE_LIST = "genomicsEngland";

export type GeRow = {
  disease: { id: string; name: string };
  target: { approvedSymbol: string };
  diseaseFromSource: string | null;
  cohortPhenotypes: string[] | null;
  confidence: string | null;
  allelicRequirements: string[] | null;
  studyOverview: string | null;
  studyId: string | null;
  literature: string[] | null;
};

/** Evidence page > GEL PanelApp (section id "genomics_england"). */
export class GenomicsEnglandSection extends GeneticEvidenceSection {
  static readonly id = "genomics_england";

  constructor(page: Page) {
    super(page, GenomicsEnglandSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, GE_COLUMN.disease).getByRole("link");
  }

  panelLink(row: number): Locator {
    return this.cell(row, GE_COLUMN.panel).getByRole("link");
  }

  /** The "Panel App Guidelines" link in the rating tooltip is reached through the help icon. */
  ratingHelp(row: number): Locator {
    return this.helpIcon(row, GE_COLUMN.rating);
  }
}
