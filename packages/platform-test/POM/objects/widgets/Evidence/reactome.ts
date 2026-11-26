import { expect, type Locator, type Page } from "@playwright/test";
import { openEvidenceSection } from "./geneticEvidenceChecks";
import {
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";

/** FGFR3 in cancer or benign tumor: 22 Reactome reactions, three pages. */
export const FGFR3_NEOPLASM: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000068078",
  efoId: "MONDO_0045024",
  symbol: "FGFR3",
  name: "cancer or benign tumor",
};
/** CTNNB1 in cancer or benign tumor: five Reactome reactions, one page. */
export const CTNNB1_NEOPLASM: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000168036",
  efoId: "MONDO_0045024",
  symbol: "CTNNB1",
  name: "cancer or benign tumor",
};

/** Columns of the Reactome table, in order. */
export const REACTOME_HEADERS = [
  "Disease / phenotype",
  "Pathway",
  "Reaction",
  "Reported target",
  "Target modulation",
  "Amino acid variation",
  "Literature",
] as const;
export const REACTOME_COLUMN = {
  disease: 0,
  pathway: 1,
  reaction: 2,
  target: 3,
  modulation: 4,
  variation: 5,
  literature: 6,
} as const;
/** The picker lists every column; only the reaction is locked. */
export const REACTOME_LOCKED = ["Reaction"] as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/Reactome). */
export const REACTOME_OPERATION = "reactomeQuery";
export const REACTOME_LIST = "reactomeSummary";

export type ReactomeRow = {
  disease: { id: string; name: string };
  diseaseFromSource: string | null;
  reactionName: string;
  reactionId: string;
  targetFromSourceId: string;
  pathways: { id: string; name: string }[] | null;
  targetModulation: string | null;
  variantAminoacidDescriptions: string[] | null;
  literature: string[] | null;
};

/**
 * The drawer a "<n> entries" or "<n> pathways" cell opens (ui TableDrawer): a title
 * ("Records"), one accordion per group and the entries of each.
 */
export class TableDrawerPanel {
  constructor(readonly page: Page) {}

  get root(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }

  get closeButton(): Locator {
    return this.root.getByTestId("drawer-close");
  }

  /** Assert the drawer is open and lists exactly these entries, under one group. */
  async expectEntries(group: string, entries: readonly string[]): Promise<void> {
    await expect(this.root, "the drawer should open").toBeVisible();
    await expect(this.root).toContainText("Records");
    await expect(this.root.getByText(group, { exact: true })).toBeVisible();
    await expect(this.root.getByText(`${entries.length} Records`, { exact: true })).toBeVisible();
    await expect(this.root.getByRole("listitem")).toHaveText([...entries]);
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.root, "the drawer should close").toBeHidden();
  }
}

/** Evidence page > Reactome (section id "reactome"). */
export class ReactomeSection extends GeneticEvidenceSection {
  static readonly id = "reactome";
  readonly tableDrawer: TableDrawerPanel;

  constructor(page: Page) {
    super(page, ReactomeSection.id);
    this.tableDrawer = new TableDrawerPanel(page);
  }

  override get chip(): Locator {
    return this.section.getByText("Pathways & systems biology", { exact: true });
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, REACTOME_COLUMN.disease).getByRole("link");
  }

  pathwayLink(row: number): Locator {
    return this.cell(row, REACTOME_COLUMN.pathway).getByRole("link");
  }

  reactionLink(row: number): Locator {
    return this.cell(row, REACTOME_COLUMN.reaction).getByRole("link");
  }

  targetLink(row: number): Locator {
    return this.cell(row, REACTOME_COLUMN.target).getByRole("link");
  }

  /** The "<n> entries" button of the amino acid variation cell. */
  variationTrigger(row: number): Locator {
    return this.cell(row, REACTOME_COLUMN.variation).getByTestId("table-drawer");
  }
}

/** Open an evidence page and wait for the Reactome section and its first page. */
export async function openReactome(
  page: Page,
  pair: EvidencePair = FGFR3_NEOPLASM
): Promise<{ section: ReactomeSection; list: EvidenceList<ReactomeRow> }> {
  const section = new ReactomeSection(page);
  const list = await openEvidenceSection<ReactomeRow>(
    page,
    section,
    REACTOME_OPERATION,
    REACTOME_LIST,
    pair
  );
  return { section, list };
}
