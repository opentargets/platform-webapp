import type { Locator, Page } from "@playwright/test";
import { GeneticEvidenceSection } from "./geneticEvidenceSection";

/** Columns of the ClinGen table, in order. */
export const CLINGEN_HEADERS = [
  "Disease/phenotype",
  "Allelic requirement",
  "Classification",
] as const;
export const CLINGEN_COLUMN = { disease: 0, allelic: 1, classification: 2 } as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/ClinGen). */
export const CLINGEN_OPERATION = "ClingenQuery";
export const CLINGEN_LIST = "clingenSummary";

export type ClinGenRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string | null;
  allelicRequirements: string[] | null;
  studyId: string | null;
  confidence: string | null;
  urls: { url: string }[] | null;
};

/** Evidence page > ClinGen (section id "clingen"). */
export class ClinGenSection extends GeneticEvidenceSection {
  static readonly id = "clingen";

  constructor(page: Page) {
    super(page, ClinGenSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, CLINGEN_COLUMN.disease).getByRole("link");
  }

  /** The classification as a link to the ClinGen curation (the tooltip has a second link). */
  classificationLink(row: number): Locator {
    return this.cell(row, CLINGEN_COLUMN.classification).locator("a");
  }
}
