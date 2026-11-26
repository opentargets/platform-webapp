import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "../shared/sectionDataControls";

/** Columns of the evidence page GWAS credible sets table, in order. */
export const EVIDENCE_GWAS_HEADERS = [
  "Credible set",
  "Lead Variant",
  "Reported trait",
  "Disease/phenotype",
  "Study",
  "Sample size",
  "P-value",
  "Beta (CI 95%)",
  "Fine-mapping confidence?",
  "Fine-mapping method",
  "L2G score?",
  "Publication",
] as const;

export const EVIDENCE_GWAS_COLUMN = {
  credibleSet: 0,
  leadVariant: 1,
  trait: 2,
  disease: 3,
  study: 4,
  sampleSize: 5,
  pValue: 6,
  beta: 7,
  confidence: 8,
  method: 9,
  l2gScore: 10,
  publication: 11,
} as const;

export type EvidenceGwasColumn = keyof typeof EVIDENCE_GWAS_COLUMN;

/** GraphQL operation behind the section (packages/sections/src/evidence/GWASCredibleSets). */
export const EVIDENCE_GWAS_OPERATION = "EvidenceGWASCredibleSetsQuery";
export const EVIDENCE_GWAS_PAGE_SIZE = 10;

export type EvidenceGwasRow = {
  score: number | null;
  disease: { id: string; name: string };
  credibleSet: {
    credibleSetId: string;
    leadPValueMantissa: number | null;
    leadPValueExponent: number | null;
    leadBeta: number | null;
    fineMappingMethod: string | null;
    confidence: number | null;
    leadVariant: { variantId: string } | null;
    study: {
      id: string;
      traitFromSource: string | null;
      nSamples: number | null;
      publicationFirstAuthor: string | null;
      publicationDate: string | null;
      pubmedId: string | null;
    };
  };
};
export type EvidenceGwasData = {
  target: { approvedSymbol: string };
  disease: { id: string; name: string; gwasCredibleSets: { count: number; rows: EvidenceGwasRow[] } };
};

/**
 * Evidence page > GWAS credible sets (section id "gwas-credible-sets"): a server-paginated
 * table of the 95% credible sets of GWAS studies that prioritise the target for the
 * disease. No search box, no sorting.
 */
export class EvidenceGwasCredibleSetsSection {
  static readonly id = "gwas-credible-sets";
  readonly section: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, EvidenceGwasCredibleSetsSection.id);
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  get title(): Locator {
    return this.section.getByTestId("section-gwas-credible-sets-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  cell(row: number, column: EvidenceGwasColumn): Locator {
    return this.table.cell(row, EVIDENCE_GWAS_COLUMN[column]);
  }

  /** The "View" link of a row, to its credible set page. */
  credibleSetLink(row: number): Locator {
    return this.cell(row, "credibleSet").getByRole("link");
  }

  leadVariantLink(row: number): Locator {
    return this.cell(row, "leadVariant").getByRole("link");
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, "disease").getByRole("link");
  }

  studyLink(row: number): Locator {
    return this.cell(row, "study").getByRole("link");
  }

  /** The four star icons of a row's fine-mapping confidence. */
  stars(row: number): Locator {
    return this.cell(row, "confidence").locator("svg");
  }

  filledStars(row: number): Locator {
    return this.cell(row, "confidence").locator("svg[data-prefix='fas']");
  }

  l2gTrigger(row: number): Locator {
    return this.cell(row, "l2gScore").getByTestId("l2g-score-trigger");
  }

  get l2gPopover(): Locator {
    return this.page.getByTestId("l2g-popover");
  }

  publicationTrigger(row: number): Locator {
    return this.cell(row, "publication").getByTestId("publications-drawer-trigger");
  }

  /** The header cell of a column with a "?" help icon, to hover. */
  headerHelp(name: string): Locator {
    return this.table.headers.filter({ hasText: name }).locator("sup");
  }
}
