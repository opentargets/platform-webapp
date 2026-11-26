import type { Locator, Page } from "@playwright/test";
import { GeneticEvidenceSection } from "./geneticEvidenceSection";

/** Columns of the UniProt literature table, in order. */
export const UNIPROT_LITERATURE_HEADERS = [
  "Disease/phenotype",
  "Reported protein",
  "Confidence",
  "Literature",
] as const;
export const UNIPROT_LITERATURE_COLUMN = {
  disease: 0,
  protein: 1,
  confidence: 2,
  literature: 3,
} as const;
/** GraphQL operation behind the section (packages/sections/src/evidence/UniProtLiterature). */
export const UNIPROT_LITERATURE_OPERATION = "UniprotLiteratureQuery";
export const UNIPROT_LITERATURE_LIST = "uniprotLiteratureSummary";

export type UniprotLiteratureRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string | null;
  targetFromSourceId: string | null;
  studyId: string | null;
  literature: string[] | null;
  confidence: string | null;
};

/** Columns of the UniProt variants table, in order. */
export const UNIPROT_VARIANTS_HEADERS = [
  "Disease/phenotype",
  "Reported protein",
  "Variant",
  "rsID",
  "Amino acid",
  "Variant Consequence",
  "Confidence",
  "Literature",
] as const;
export const UNIPROT_VARIANTS_COLUMN = {
  disease: 0,
  protein: 1,
  variant: 2,
  rsId: 3,
  aminoAcid: 4,
  consequence: 5,
  confidence: 6,
  literature: 7,
} as const;
/** GraphQL operation behind the section (packages/sections/src/evidence/UniProtVariants). */
export const UNIPROT_VARIANTS_OPERATION = "UniprotVariantsQuery";
export const UNIPROT_VARIANTS_LIST = "uniprotVariantsSummary";

export type UniprotVariantsRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string | null;
  targetFromSourceId: string | null;
  variant: {
    id: string;
    chromosome: string;
    position: number;
    referenceAllele: string;
    alternateAllele: string;
    transcriptConsequences: { aminoAcidChange: string | null }[] | null;
  } | null;
  variantRsId: string | null;
  confidence: string | null;
  literature: string[] | null;
};

/** Evidence page > UniProt literature (section id "uniprot_literature"). */
export class UniprotLiteratureSection extends GeneticEvidenceSection {
  static readonly id = "uniprot_literature";

  constructor(page: Page) {
    super(page, UniprotLiteratureSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, UNIPROT_LITERATURE_COLUMN.disease).getByRole("link");
  }

  proteinLink(row: number): Locator {
    return this.cell(row, UNIPROT_LITERATURE_COLUMN.protein).getByRole("link");
  }
}

/** Evidence page > UniProt variants (section id "uniprot_variants"). */
export class UniprotVariantsEvidenceSection extends GeneticEvidenceSection {
  static readonly id = "uniprot_variants";

  constructor(page: Page) {
    super(page, UniprotVariantsEvidenceSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, UNIPROT_VARIANTS_COLUMN.disease).getByRole("link");
  }

  proteinLink(row: number): Locator {
    return this.cell(row, UNIPROT_VARIANTS_COLUMN.protein).getByRole("link");
  }

  variantLink(row: number): Locator {
    return this.cell(row, UNIPROT_VARIANTS_COLUMN.variant).getByRole("link");
  }

  rsIdLink(row: number): Locator {
    return this.cell(row, UNIPROT_VARIANTS_COLUMN.rsId).getByRole("link");
  }

  /** The ProtVar chip of the variant consequence column. */
  protVarLink(row: number): Locator {
    return this.cell(row, UNIPROT_VARIANTS_COLUMN.consequence).getByRole("link");
  }
}
