import { expect, type Locator, type Page } from "@playwright/test";
import type { EvidenceViewsData } from "./geneticEvidenceChecks";
import { SomaticEvidenceSection } from "./somaticEvidenceSection";

export const BIOMARKERS_HEADERS = [
  "Disease",
  "Biomarker",
  "Reported drug",
  "Drug response",
  "Source",
  "Literature",
] as const;
export const BIOMARKERS_COLUMN = {
  disease: 0,
  biomarker: 1,
  drug: 2,
  drugResponse: 3,
  source: 4,
  literature: 5,
} as const;
/** GraphQL operation behind the section (packages/sections/src/evidence/CancerBiomarkers). */
export const BIOMARKERS_OPERATION = "CancerBiomarkersQuery";
/** The field of `disease.evidenceViews` the query reads. */
export const BIOMARKERS_LIST = "cancerBiomarkers";

export type BiomarkerRow = {
  diseaseId: string;
  diseaseName: string;
  diseaseFromSource: string;
  biomarkerName: string;
  biomarkerGeneticVariations: {
    id: string | null;
    name: string;
    functionalConsequenceId: string | null;
    functionalConsequenceLabel: string | null;
  }[];
  biomarkerGeneExpressions: { id: string | null; name: string; label: string | null }[];
  drugFromSource: string;
  drugId: string | null;
  drugName: string | null;
  drugResponseId: string | null;
  drugResponseName: string | null;
  confidence: string;
  literature: string[];
  urls: { niceName: string; url: string }[];
};

type SentVariables = { search?: { text?: string } };

/**
 * Wait for the Cancer Biomarkers response whose request variables match, and return its
 * data. Start it before the typing that sends the request.
 */
export async function waitForBiomarkersRequest(
  page: Page,
  matches: (variables: SentVariables) => boolean
): Promise<EvidenceViewsData<BiomarkerRow>> {
  const response = await page.waitForResponse(
    (candidate) => {
      const request = candidate.request();
      if (request.method() !== "POST") return false;
      const body = request.postDataJSON?.() as {
        operationName?: string;
        variables?: SentVariables;
      } | null;
      return body?.operationName === BIOMARKERS_OPERATION && matches(body.variables ?? {});
    },
    { timeout: 60_000 }
  );
  const body = (await response.json()) as {
    data: EvidenceViewsData<BiomarkerRow>;
    errors?: unknown[];
  };
  expect(body.errors, `${BIOMARKERS_OPERATION} should not return GraphQL errors`).toBeUndefined();
  return body.data;
}

/** Evidence page > Cancer Biomarkers (section id "cancer_biomarkers"). */
export class CancerBiomarkersSection extends SomaticEvidenceSection {
  static readonly id = "cancer_biomarkers";

  constructor(page: Page) {
    super(page, CancerBiomarkersSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.table.cell(row, BIOMARKERS_COLUMN.disease).getByRole("link");
  }

  /** The button that opens the biomarker drawer. */
  biomarkerButton(row: number): Locator {
    return this.table.cell(row, BIOMARKERS_COLUMN.biomarker).getByRole("button");
  }

  drugLink(row: number): Locator {
    return this.table.cell(row, BIOMARKERS_COLUMN.drug).getByRole("link");
  }

  /** The Source cell's link (one source) or its drawer button (several). */
  sourceLink(row: number): Locator {
    return this.table.cell(row, BIOMARKERS_COLUMN.source).getByRole("link");
  }

  sourceDrawerButton(row: number): Locator {
    return this.table.cell(row, BIOMARKERS_COLUMN.source).getByTestId("table-drawer");
  }

  get sourceDrawer(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }

  get biomarkerDrawer(): Locator {
    return this.page.getByTestId("biomarkers-drawer");
  }
}
