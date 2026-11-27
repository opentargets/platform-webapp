import type { Locator, Page } from "@playwright/test";
import { SomaticEvidenceSection } from "./somaticEvidenceSection";

export const CGC_HEADERS = [
  "Disease/phenotype",
  "Mutation type",
  "Mutated / Total samples",
  "Literature",
] as const;
export const CGC_COLUMN = { disease: 0, mutationType: 1, samples: 2, literature: 3 } as const;
/** GraphQL operation behind the section (packages/sections/src/evidence/CancerGeneCensus). */
export const CGC_OPERATION = "CancerGeneCensusQuery";

export type CgcRow = {
  disease: { id: string; name: string };
  mutatedSamples: {
    numberSamplesWithMutationType: number;
    numberSamplesTested: number;
    functionalConsequence: { id: string; label: string };
  }[];
  literature: string[];
};

/** Evidence page > Cancer Gene Census (section id "cancer_gene_census"). */
export class CancerGeneCensusSection extends SomaticEvidenceSection {
  static readonly id = "cancer_gene_census";

  constructor(page: Page) {
    super(page, CancerGeneCensusSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.table.cell(row, CGC_COLUMN.disease).getByRole("link");
  }

  /** The mutation type links of a row, one list item each. */
  mutationLinks(row: number): Locator {
    return this.table.cell(row, CGC_COLUMN.mutationType).getByRole("link");
  }

  /** The "n% (mutated/tested)" list items of a row. */
  sampleItems(row: number): Locator {
    return this.table.cell(row, CGC_COLUMN.samples).getByRole("listitem");
  }
}
