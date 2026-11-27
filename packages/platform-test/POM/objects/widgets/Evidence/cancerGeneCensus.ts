import { expect, type Locator, type Page } from "@playwright/test";
import type { EvidenceViewsData } from "./geneticEvidenceChecks";
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
/** The field of `disease.evidenceViews` the query reads. */
export const CGC_LIST = "cancerGeneCensus";
/** The sort the section asks for on load: mutated over total samples, ascending. */
export const CGC_DEFAULT_SORT = { key: "MUTATED_SAMPLES", direction: "ASCENDING" } as const;

export type CgcRow = {
  diseaseId: string;
  diseaseName: string;
  mutatedSamples: {
    numberSamplesWithMutationType: number;
    numberSamplesTested: number;
    functionalConsequenceId: string;
    functionalConsequenceLabel: string;
  }[];
  literature: string[];
};

type SentVariables = {
  sort?: { key: string; direction: string }[];
  search?: { text?: string };
};

/**
 * Wait for the Cancer Gene Census response whose request variables match, and return its
 * data. Start it before the click or the typing that sends the request.
 */
export async function waitForCgcRequest(
  page: Page,
  matches: (variables: SentVariables) => boolean
): Promise<EvidenceViewsData<CgcRow>> {
  const response = await page.waitForResponse(
    (candidate) => {
      const request = candidate.request();
      if (request.method() !== "POST") return false;
      const body = request.postDataJSON?.() as {
        operationName?: string;
        variables?: SentVariables;
      } | null;
      return body?.operationName === CGC_OPERATION && matches(body.variables ?? {});
    },
    { timeout: 60_000 }
  );
  const body = (await response.json()) as {
    data: EvidenceViewsData<CgcRow>;
    errors?: unknown[];
  };
  expect(body.errors, `${CGC_OPERATION} should not return GraphQL errors`).toBeUndefined();
  return body.data;
}

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
