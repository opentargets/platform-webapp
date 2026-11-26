import type { Locator, Page } from "@playwright/test";
import { openEvidenceSection } from "./geneticEvidenceChecks";
import { TableDrawerPanel } from "./reactome";
import {
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";

/** FGFR3 in cancer or benign tumor: 134 IMPC mouse models, 14 pages. */
export const FGFR3_NEOPLASM_IMPC: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000068078",
  efoId: "MONDO_0045024",
  symbol: "FGFR3",
  name: "cancer or benign tumor",
};
/** CTNNB1 in cancer or benign tumor: 11 IMPC mouse models, a second page with a single row. */
export const CTNNB1_NEOPLASM_IMPC: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000168036",
  efoId: "MONDO_0045024",
  symbol: "CTNNB1",
  name: "cancer or benign tumor",
};

/** Columns of the IMPC table, in order. "Direction of Effect" carries a help icon. */
export const IMPC_HEADERS = [
  "Disease/phenotype",
  "Human phenotypes",
  "Mouse phenotypes",
  "Direction of Effect?",
  "Mouse model allelic composition",
] as const;
export const IMPC_COLUMN = {
  disease: 0,
  human: 1,
  mouse: 2,
  direction: 3,
  model: 4,
} as const;
/** The picker lists every column; only the mouse model is locked. */
export const IMPC_LOCKED = ["Mouse model allelic composition"] as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/Impc). */
export const IMPC_OPERATION = "impcQuery";
export const IMPC_LIST = "impc";

export type ImpcRow = {
  disease: { id: string; name: string };
  target: { id: string; approvedSymbol: string };
  directionOnTarget: string | null;
  directionOnTrait: string | null;
  diseaseFromSource: string | null;
  biologicalModelGeneticBackground: string | null;
  biologicalModelAllelicComposition: string | null;
  biologicalModelId: string | null;
  diseaseModelAssociatedModelPhenotypes: { id: string; label: string }[];
  diseaseModelAssociatedHumanPhenotypes: { id: string; label: string }[] | null;
};

/** "3 phenotypes", "1 phenotype", "0 phenotypes": what the phenotype cells say. */
export function phenotypeCount(phenotypes: readonly unknown[] | null): string {
  const count = phenotypes ? phenotypes.length : 0;
  return `${count} phenotype${count === 1 ? "" : "s"}`;
}

/** An allelic composition as the cell prints it: the superscripts of "Pten<tm1Rps>/Pten<+>" are inline text. */
export function allelicText(composition: string): string {
  const match = /(.*)<(.*)>\/([^<]*)<?([^>]*)?>?/.exec(composition);
  return match ? `${match[1]}${match[2]}/${match[3]}${match[4]}` : composition;
}

/** Evidence page > IMPC (section id "impc"). */
export class ImpcSection extends GeneticEvidenceSection {
  static readonly id = "impc";
  readonly tableDrawer: TableDrawerPanel;

  constructor(page: Page) {
    super(page, ImpcSection.id);
    this.tableDrawer = new TableDrawerPanel(page);
  }

  override get chip(): Locator {
    return this.section.getByText("Animal models", { exact: true });
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, IMPC_COLUMN.disease).getByRole("link");
  }

  modelLink(row: number): Locator {
    return this.cell(row, IMPC_COLUMN.model).getByRole("link");
  }

  phenotypesTrigger(row: number, column: number): Locator {
    return this.cell(row, column).getByTestId("table-drawer");
  }

  directionIcons(row: number): Locator {
    return this.cell(row, IMPC_COLUMN.direction).locator("svg");
  }

  get directionHeaderHelp(): Locator {
    return this.table.headers.nth(IMPC_COLUMN.direction).locator("sup");
  }
}

/** Open an evidence page and wait for the IMPC section and its first page. */
export async function openImpc(
  page: Page,
  pair: EvidencePair = FGFR3_NEOPLASM_IMPC
): Promise<{ section: ImpcSection; list: EvidenceList<ImpcRow> }> {
  const section = new ImpcSection(page);
  const list = await openEvidenceSection<ImpcRow>(page, section, IMPC_OPERATION, IMPC_LIST, pair);
  return { section, list };
}
