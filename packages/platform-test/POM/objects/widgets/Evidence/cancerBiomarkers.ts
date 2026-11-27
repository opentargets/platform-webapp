import type { Locator, Page } from "@playwright/test";
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

export type BiomarkerRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string;
  biomarkerName: string;
  biomarkers: {
    geneticVariation: {
      geneticVariationId: string | null;
      name: string;
      functionalConsequenceId: { id: string; label: string } | null;
    }[];
    geneExpression: { name: string; id: { id: string; label: string } }[];
  };
  drugFromSource: string;
  drug: { id: string; name: string } | null;
  drugResponse: { id: string; name: string } | null;
  confidence: string;
  literature: string[];
  urls: { niceName: string; url: string }[];
};

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
