import { expect, type Locator, type Page } from "@playwright/test";
import type { EvidenceViewsData } from "./geneticEvidenceChecks";
import { SomaticEvidenceSection } from "./somaticEvidenceSection";

export const INTOGEN_HEADERS = [
  "Disease/phenotype",
  "Mutated / Total samples",
  /^Combined p-value/,
  /^Cancer driver methods/,
  "Cohort Information",
] as const;
export const INTOGEN_COLUMN = {
  disease: 0,
  samples: 1,
  pValue: 2,
  methods: 3,
  cohort: 4,
} as const;
/** GraphQL operation behind the section (packages/sections/src/evidence/IntOgen). */
export const INTOGEN_OPERATION = "IntOgenQuery";
/** The field of `disease.evidenceViews` the query reads. */
export const INTOGEN_LIST = "intogen";
/** The sort the section asks for on load: combined p-value, ascending. */
export const INTOGEN_DEFAULT_SORT = { key: "P_VALUE", direction: "ASCENDING" } as const;

export type IntOgenRow = {
  diseaseId: string;
  diseaseName: string;
  diseaseFromSource: string;
  targetApprovedSymbol: string;
  mutatedSamples: {
    numberSamplesTested: number;
    numberMutatedSamples: number;
  }[];
  resourceScore: number;
  significantDriverMethods: string[] | null;
  cohortId: string;
  cohortShortName: string | null;
  cohortDescription: string | null;
};

type SentVariables = {
  sort?: { key: string; direction: string }[];
  search?: { text?: string };
};

/**
 * Wait for the IntOGen response whose request variables match, and return its data.
 * Start it before the click or the typing that sends the request.
 */
export async function waitForIntOgenRequest(
  page: Page,
  matches: (variables: SentVariables) => boolean
): Promise<EvidenceViewsData<IntOgenRow>> {
  const response = await page.waitForResponse(
    (candidate) => {
      const request = candidate.request();
      if (request.method() !== "POST") return false;
      const body = request.postDataJSON?.() as {
        operationName?: string;
        variables?: SentVariables;
      } | null;
      return body?.operationName === INTOGEN_OPERATION && matches(body.variables ?? {});
    },
    { timeout: 60_000 }
  );
  const body = (await response.json()) as {
    data: EvidenceViewsData<IntOgenRow>;
    errors?: unknown[];
  };
  expect(body.errors, `${INTOGEN_OPERATION} should not return GraphQL errors`).toBeUndefined();
  return body.data;
}

/** Evidence page > IntOGen (section id "intogen"). */
export class IntOgenSection extends SomaticEvidenceSection {
  static readonly id = "intogen";

  constructor(page: Page) {
    super(page, IntOgenSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.disease).getByRole("link");
  }

  sampleItems(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.samples).getByRole("listitem");
  }

  /** The driver method chips of a row. */
  methodChips(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.methods).locator("[data-testid^='chip-item-']");
  }

  cohortLink(row: number): Locator {
    return this.table.cell(row, INTOGEN_COLUMN.cohort).getByRole("link");
  }

  /** A column header's help icon, which carries a tooltip. */
  headerHelp(name: RegExp): Locator {
    return this.table.header(name).locator("sup");
  }
}
