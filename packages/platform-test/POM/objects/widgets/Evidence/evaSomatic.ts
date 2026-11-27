import type { Locator, Page } from "@playwright/test";
import { SomaticEvidenceSection } from "./somaticEvidenceSection";

export const EVA_SOMATIC_COLUMN = {
  disease: 0,
  variant: 1,
  rsId: 2,
  hgvs: 3,
  clinvarId: 4,
  significance: 5,
  directionOfEffect: 6,
  alleleOrigin: 7,
  reviewStatus: 8,
  literature: 9,
} as const;
export const EVA_SOMATIC_HEADERS = [
  "Disease/phenotype",
  "Variant",
  "rsID",
  "HGVS ID",
  "ClinVar ID",
  "Clinical significance",
  /Direction of effect/i,
  "Allele origin",
  "Review status",
  "Literature",
] as const;
/** GraphQL operation behind the section (packages/sections/src/evidence/EvaSomatic). */
export const EVA_SOMATIC_OPERATION = "EvaSomaticQuery";

export type EvaSomaticRow = {
  disease: { id: string; name: string };
  variant: {
    id: string;
    hgvsId: string | null;
    referenceAllele: string;
    alternateAllele: string;
  } | null;
  directionOnTarget: string | null;
  directionOnTrait: string | null;
  diseaseFromSource: string;
  variantRsId: string | null;
  studyId: string;
  clinicalSignificances: string[] | null;
  allelicRequirements: string[] | null;
  alleleOrigins: string[] | null;
  confidence: string;
  literature: string[];
  cohortPhenotypes: string[];
};

/** Evidence page > EVA somatic (section id "eva_somatic"). */
export class EvaSomaticSection extends SomaticEvidenceSection {
  static readonly id = "eva_somatic";

  constructor(page: Page) {
    super(page, EvaSomaticSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.table.cell(row, EVA_SOMATIC_COLUMN.disease).getByRole("link");
  }

  variantLink(row: number): Locator {
    return this.table.cell(row, EVA_SOMATIC_COLUMN.variant).getByRole("link");
  }

  rsIdLink(row: number): Locator {
    return this.table.cell(row, EVA_SOMATIC_COLUMN.rsId).getByRole("link");
  }

  clinvarLink(row: number): Locator {
    return this.table.cell(row, EVA_SOMATIC_COLUMN.clinvarId).getByRole("link");
  }

  /** The star icons of a row's review status; the filled ones are solid (fas). */
  stars(row: number): Locator {
    return this.table.cell(row, EVA_SOMATIC_COLUMN.reviewStatus).locator("svg");
  }

  filledStars(row: number): Locator {
    return this.table.cell(row, EVA_SOMATIC_COLUMN.reviewStatus).locator("svg[data-prefix='fas']");
  }
}
