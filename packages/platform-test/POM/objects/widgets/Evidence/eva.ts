import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "../shared/sectionDataControls";

/** Columns of the evidence page ClinVar (EVA) table, in order. */
export const EVIDENCE_EVA_HEADERS = [
  "Disease/phenotype",
  "Variant",
  "rsID",
  "HGVS ID",
  "ClinVar ID",
  "Variant Consequence",
  "Direction of Effect?",
  "Clinical significance",
  "Allele origin",
  "Review status",
  "Literature",
] as const;

export const EVIDENCE_EVA_COLUMN = {
  disease: 0,
  variant: 1,
  rsId: 2,
  hgvs: 3,
  clinvarId: 4,
  consequence: 5,
  direction: 6,
  significance: 7,
  alleleOrigin: 8,
  reviewStatus: 9,
  literature: 10,
} as const;

export type EvidenceEvaColumn = keyof typeof EVIDENCE_EVA_COLUMN;

/** GraphQL operation behind the section (packages/sections/src/evidence/EVA). */
export const EVIDENCE_EVA_OPERATION = "ClinvarQuery";
export const EVIDENCE_EVA_PAGE_SIZE = 10;

export type EvidenceEvaRow = {
  disease: { id: string; name: string };
  variant: {
    id: string;
    hgvsId: string | null;
    chromosome: string;
    position: number;
    referenceAllele: string;
    alternateAllele: string;
  } | null;
  directionOnTarget: string | null;
  directionOnTrait: string | null;
  diseaseFromSource: string | null;
  variantRsId: string | null;
  studyId: string | null;
  variantFunctionalConsequence: { id: string; label: string } | null;
  clinicalSignificances: string[] | null;
  allelicRequirements: string[] | null;
  alleleOrigins: string[] | null;
  confidence: string | null;
  literature: string[] | null;
  cohortPhenotypes: string[] | null;
};
export type EvidenceEvaData = {
  target: { approvedSymbol: string };
  disease: { id: string; name: string; eva: { count: number; rows: EvidenceEvaRow[] } };
};

/**
 * Evidence page > ClinVar (section id "eva"): a server-paginated table of the ClinVar
 * submissions linking the target's variants to the disease. No search box, no sorting.
 */
export class EvidenceEvaSection {
  static readonly id = "eva";
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, EvidenceEvaSection.id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-eva-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  cell(row: number, column: EvidenceEvaColumn): Locator {
    return this.table.cell(row, EVIDENCE_EVA_COLUMN[column]);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, "disease").getByRole("link");
  }

  variantLink(row: number): Locator {
    return this.cell(row, "variant").getByRole("link");
  }

  rsIdLink(row: number): Locator {
    return this.cell(row, "rsId").getByRole("link");
  }

  clinvarLink(row: number): Locator {
    return this.cell(row, "clinvarId").getByRole("link");
  }

  /** The "?" help icon of a cell that carries a tooltip. */
  helpIcon(row: number, column: EvidenceEvaColumn): Locator {
    return this.cell(row, column).locator("sup");
  }

  stars(row: number): Locator {
    return this.cell(row, "reviewStatus").locator("svg");
  }

  filledStars(row: number): Locator {
    return this.cell(row, "reviewStatus").locator("svg[data-prefix='fas']");
  }

  /** The two icons (variant effect, effect on trait) of a row's direction of effect. */
  directionIcons(row: number): Locator {
    return this.cell(row, "direction").locator("svg");
  }

  literatureTrigger(row: number): Locator {
    return this.cell(row, "literature").getByTestId("publications-drawer-trigger");
  }
}
