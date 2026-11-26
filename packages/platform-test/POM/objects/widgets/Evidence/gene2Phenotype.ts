import { expect, type Locator, type Page } from "@playwright/test";
import { GeneticEvidenceSection } from "./geneticEvidenceSection";

/** Columns of the Gene2Phenotype table, in order. "Direction of Effect" carries a help icon. */
export const G2P_HEADERS = [
  "Disease/phenotype",
  "Functional consequence",
  "Direction of Effect?",
  "Allelic requirement",
  "Panel",
  "Confidence category",
  "Literature",
] as const;
export const G2P_COLUMN = {
  disease: 0,
  consequence: 1,
  direction: 2,
  allelic: 3,
  panel: 4,
  confidence: 5,
  literature: 6,
} as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/Gene2Phenotype). */
export const G2P_OPERATION = "OpenTargetsGeneticsQuery";
export const G2P_LIST = "gene2Phenotype";

export type G2pRow = {
  id: string;
  disease: { id: string; name: string };
  diseaseFromSource: string | null;
  allelicRequirements: string[] | null;
  confidence: string | null;
  studyId: string | null;
  targetFromSourceId: string | null;
  variantFunctionalConsequence: { id: string; label: string } | null;
  literature: string[] | null;
  directionOnTarget: string | null;
  directionOnTrait: string | null;
};

/** What the direction-of-effect tooltip says for a variant effect and a direction on the trait. */
export const DIRECTION_LABEL: Record<string, string> = {
  lof: "Loss of Function",
  gof: "Gain of Function",
  risk: "Risk",
  protect: "Protective",
  default: "Inconclusive Assessment",
};
export const directionText = (onTarget: string | null, onTrait: string | null): string =>
  `${DIRECTION_LABEL[(onTarget ?? "default").toLowerCase()]} │ ${DIRECTION_LABEL[(onTrait ?? "default").toLowerCase()]}`;

/** Evidence page > Gene2Phenotype (section id "gene2phenotype"). */
export class Gene2PhenotypeSection extends GeneticEvidenceSection {
  static readonly id = "gene2phenotype";

  constructor(page: Page) {
    super(page, Gene2PhenotypeSection.id);
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, G2P_COLUMN.disease).getByRole("link");
  }

  consequenceLink(row: number): Locator {
    return this.cell(row, G2P_COLUMN.consequence).getByRole("link");
  }

  panelLink(row: number): Locator {
    return this.cell(row, G2P_COLUMN.panel).getByRole("link");
  }

  /** The two icons (variant effect, effect on trait) of a row's direction of effect. */
  directionIcons(row: number): Locator {
    return this.cell(row, G2P_COLUMN.direction).locator("svg");
  }

  /** Hover a row's direction-of-effect icons and return the tooltip text. */
  async openDirection(row: number): Promise<Locator> {
    await this.page.mouse.move(0, 0);
    await expect(this.tooltip, "an earlier tooltip should close").toHaveCount(0);
    await this.directionIcons(row).first().hover();
    await expect(this.tooltip).toBeVisible();
    return this.tooltip;
  }

  /** The header's help icon, whose tooltip links to the assessment method. */
  get directionHeaderHelp(): Locator {
    return this.table.headers.nth(G2P_COLUMN.direction).locator("sup");
  }
}
