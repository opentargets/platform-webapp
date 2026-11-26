import { expect, type Locator, type Page } from "@playwright/test";
import { LegacyTable, ProfileSection, TableControls } from "../Target/sectionWidgets";

export type InteractionSource = "intact" | "signor" | "reactome" | "string";

/** Sources that show a list of interactors next to the evidence of the selected one. */
export type EvidenceSource = Exclude<InteractionSource, "string">;

const INTERACTOR_HEADER = /^Interactor\s*B\s*Alt ID$/;
const EVIDENCE_ENTRIES_HEADER = "Interaction evidence entries";
const INTERACTION_HEADER = /^Interaction\s*Host organism$/;

/**
 * Molecular Interactions section of the target profile. One tab per source database;
 * IntAct, Signor and Reactome show the interactors and, for the selected interactor, its
 * evidence; String shows a heatmap of evidence scores.
 */
export class MolecularInteractionsSection extends ProfileSection {
  static readonly SOURCES: readonly InteractionSource[] = ["intact", "signor", "reactome", "string"];

  static readonly TAB_LABELS: Record<InteractionSource, RegExp> = {
    intact: /^IntAct\s*\d+ molecular interactions$/,
    signor: /^Signor\s*\d+ directional, causal interactions$/,
    reactome: /^Reactome\s*\d+ pathway-based interactions$/,
    string: /^String\s*\d+ functional interactions$/,
  };

  static readonly INTERACTOR_COLUMNS: Record<InteractionSource, readonly (string | RegExp)[]> = {
    intact: [INTERACTOR_HEADER, "Score", "Biological role", EVIDENCE_ENTRIES_HEADER],
    signor: [INTERACTOR_HEADER, "Biological role", EVIDENCE_ENTRIES_HEADER],
    reactome: [INTERACTOR_HEADER, EVIDENCE_ENTRIES_HEADER],
    string: [
      "Interactor B",
      /^Overall\s*interaction score$/,
      "Neighbourhood",
      "Gene fusion",
      "Co-occurrance",
      "Co-expression",
      "Experiments",
      "Databases",
      "Text mining",
      "Homology",
    ],
  };

  static readonly EVIDENCE_COLUMNS: Record<EvidenceSource, readonly (string | RegExp)[]> = {
    intact: ["Identifier", INTERACTION_HEADER, "Detection methods", "Publication"],
    signor: ["Identifier", INTERACTION_HEADER, "Detection methods", "Publication"],
    reactome: ["ID", INTERACTION_HEADER, "Detection methods", "Publication"],
  };

  constructor(page: Page) {
    super(page, "interactions");
  }

  get tabs(): Locator {
    return this.section.getByTestId("interactions-tabs").getByRole("tab");
  }

  tab(source: InteractionSource): Locator {
    return this.section.getByTestId(`interactions-tab-${source}`);
  }

  /** The body of a source's tab. Only the selected source has one. */
  content(source: InteractionSource): Locator {
    return this.section.getByTestId(`interactions-content-${source}`);
  }

  /** The interactors table of a source (for String, its only table). */
  interactors(source: InteractionSource): TableControls {
    const scope =
      source === "string"
        ? this.content(source)
        : this.content(source).getByTestId("interactions-interactors");
    return new TableControls(this.page, scope);
  }

  /** The evidence table of the interactor selected in a source's interactors table. */
  evidence(source: EvidenceSource): LegacyTable {
    return new LegacyTable(this.page, this.content(source).getByTestId("interactions-evidence"));
  }

  interactorsTitle(source: EvidenceSource): Locator {
    return this.content(source).getByTestId("interactions-interactors-title");
  }

  evidenceTitle(source: EvidenceSource): Locator {
    return this.content(source).getByTestId("interactions-evidence-title");
  }

  /** The interactor's name: a link to its target page, or to UniProt when it is not a target. */
  interactorLink(source: InteractionSource, rowIndex: number): Locator {
    return this.interactors(source).table.cell(rowIndex, 0).getByRole("link").first();
  }

  /** The "Alt ID" link to the interactor's UniProt entry (not shown for String). */
  altIdLink(source: EvidenceSource, rowIndex: number): Locator {
    return this.interactors(source).table.cell(rowIndex, 0).getByRole("link").nth(1);
  }

  /** The "Interaction evidence entries" cell: the number of evidence rows of an interactor. */
  evidenceCountCell(source: EvidenceSource, rowIndex: number): Locator {
    return this.interactors(source).table.row(rowIndex).locator("td").last();
  }

  /** The A or B participant icon in a cell; hovering it shows that participant's value. */
  participantIcon(cell: Locator, participant: "A" | "B"): Locator {
    return cell.getByText(participant, { exact: true });
  }

  /** The heatmap squares of a String row, one per evidence channel. */
  stringScoreCells(rowIndex: number): Locator {
    return this.interactors("string").table.row(rowIndex).locator("td span[title]");
  }

  get stringLegendLink(): Locator {
    return this.content("string").getByRole("link", { name: "Score" });
  }

  /** Assert the tab counts have loaded and return the number of interactions a tab reports. */
  async tabCount(source: InteractionSource): Promise<number> {
    await expect(this.tab(source), `the ${source} tab should show its label and count`).toHaveText(
      MolecularInteractionsSection.TAB_LABELS[source]
    );
    const text = await this.tab(source).innerText();
    return Number((/\d+/.exec(text) as RegExpExecArray)[0]);
  }

  /** Assert a source's tab is selected and its content, and no other source's, is shown. */
  async expectActive(source: InteractionSource): Promise<void> {
    await expect(this.tab(source)).toHaveAttribute("aria-selected", "true");
    await expect(this.content(source)).toBeVisible();
    for (const other of MolecularInteractionsSection.SOURCES) {
      if (other !== source) await expect(this.content(other)).toHaveCount(0);
    }
    await this.interactors(source).expectLoaded();
  }

  /** Click a source's tab and wait for its table. */
  async open(source: InteractionSource): Promise<void> {
    await this.tab(source).click();
    await this.expectActive(source);
  }

  /** Select an interactor by clicking its row (away from the links, which navigate). */
  async selectInteractor(source: EvidenceSource, rowIndex: number): Promise<void> {
    await this.evidenceCountCell(source, rowIndex).click();
  }

  /** The name shown for each interactor on the current page. */
  async interactorNames(source: InteractionSource): Promise<string[]> {
    return this.interactors(source).rows.evaluateAll((rows) =>
      rows.map((row) => row.querySelector("td a")?.textContent?.trim() ?? "")
    );
  }

  /** The number in a row's "Interaction evidence entries" cell. */
  async evidenceCount(source: EvidenceSource, rowIndex: number): Promise<number> {
    await expect(this.evidenceCountCell(source, rowIndex)).toHaveText(/^\d+$/);
    return Number(await this.evidenceCountCell(source, rowIndex).innerText());
  }

  /**
   * Assert the evidence panel shows the evidence of one interactor: its name in the
   * heading and exactly `count` evidence rows (ten per page).
   */
  async expectEvidenceOf(
    source: EvidenceSource,
    targetSymbol: string,
    interactor: string,
    count: number
  ): Promise<void> {
    await expect(this.evidenceTitle(source)).toHaveText(
      new RegExp(`^Interaction evidence of\\s*${targetSymbol}\\s*A\\s*\\+ ${escapeRegExp(interactor)}\\s*B$`)
    );
    const evidence = this.evidence(source);
    if (count > 10) {
      await expect(evidence.pagePosition).toHaveText(`1–10 of ${count}`);
      await expect(evidence.rows).toHaveCount(10);
    } else {
      await expect(evidence.rows).toHaveCount(count);
      await expect(
        evidence.pagePosition,
        "a table that fits on one page has no pagination"
      ).toHaveCount(0);
    }
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
