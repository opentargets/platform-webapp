import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionTable } from "../Drug/sectionTable";

const CARD_TEXT = /^(.+?)\s*Max stage:\s*(.+?)\s*(\d+) reports?$/s;

export type DrugCard = {
  /** Drug name, as the card shows it */
  name: string;
  /** Drug id, from the card's link */
  drugId: string;
  /** Label of the drug's maximum clinical stage for this disease */
  stage: string;
  /** Number of clinical reports */
  reports: number;
};

/**
 * Disease page: "Drugs and Clinical Candidates". A master-detail layout: the drugs on
 * the left (a server-paginated, server-searched, server-sorted list of cards), and on the
 * right the clinical reports of the selected drug, filtered by clinical stage.
 */
export class DiseaseDrugsSection {
  static readonly id = "drugs";
  readonly section: Locator;
  /** The list of drugs. */
  readonly master: SectionTable;
  /** The clinical reports of the selected drug. */
  readonly records: SectionTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, DiseaseDrugsSection.id);
    this.master = new SectionTable(this.section, 0);
    this.records = new SectionTable(this.recordsPanel, 0);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  get cards(): Locator {
    return this.section.getByTestId("drug-card");
  }

  card(index: number): Locator {
    return this.cards.nth(index);
  }

  get selectedCard(): Locator {
    return this.section.locator("[data-testid='drug-card'][data-selected='true']");
  }

  get recordsPanel(): Locator {
    return this.section.getByTestId("clinical-records");
  }

  /** "12 reports for SIMVASTATIN" */
  get recordsSummary(): Locator {
    return this.section.getByTestId("clinical-records-summary");
  }

  get stageSlots(): Locator {
    return this.recordsPanel.locator("[data-testid^='stage-filter-']");
  }

  /** The stages that have reports: only these can be selected. */
  get stageButtons(): Locator {
    return this.recordsPanel.locator("button[data-testid^='stage-filter-']");
  }

  stage(key: string): Locator {
    return this.recordsPanel.getByTestId(`stage-filter-${key}`);
  }

  get selectedStage(): Locator {
    return this.recordsPanel.locator("[data-testid^='stage-filter-'][data-selected='true']");
  }

  get recordRows(): Locator {
    return this.recordsPanel.getByTestId("clinical-record");
  }

  get recordDrawer(): Locator {
    return this.page.getByTestId("clinical-record-drawer");
  }

  /** Assert the list shows `count` drug cards and has finished loading. */
  async expectCards(count: number): Promise<void> {
    await expect(this.cards, `the list should show ${count} drug(s)`).toHaveCount(count);
    await expect(
      this.master.table.locator(".MuiSkeleton-root"),
      "the list should finish loading"
    ).toHaveCount(0);
  }

  /** Read one card after asserting it has the full card layout. */
  async cardInfo(index: number): Promise<DrugCard> {
    const card = this.card(index);
    await expect(card, "a drug card shows name, max stage and report count").toHaveText(CARD_TEXT);
    const link = card.getByRole("link");
    await expect(link).toHaveAttribute("href", /^\/drug\/CHEMBL\d+$/);
    const href = (await link.getAttribute("href")) ?? "";
    const match = CARD_TEXT.exec((await card.innerText()).trim());
    if (!match) throw new Error(`drug card ${index} changed while it was being read`);
    return {
      name: match[1].trim(),
      drugId: href.replace("/drug/", ""),
      stage: match[2].trim(),
      reports: Number(match[3]),
    };
  }

  async allCards(): Promise<DrugCard[]> {
    const count = await this.cards.count();
    const cards: DrugCard[] = [];
    for (let index = 0; index < count; index++) cards.push(await this.cardInfo(index));
    return cards;
  }

  /** Assert the detail panel shows the reports of this drug. */
  async expectDetailFor(card: DrugCard): Promise<void> {
    await expect(
      this.recordsSummary,
      `the detail panel should show the reports of "${card.name}"`
    ).toHaveText(`${card.reports} ${card.reports > 1 ? "reports" : "report"} for ${card.name}`);
    await expect(this.recordsSummary.getByRole("link", { name: card.name })).toHaveAttribute(
      "href",
      `/drug/${card.drugId}`
    );
    await expect(this.selectedStage, "one stage should be selected").toHaveCount(1);
    await expect(this.recordRows.first(), "the reports should be listed").toBeVisible();
  }

  /** The number of reports each stage button shows, keyed by the stage's test-id suffix. */
  async stageCounts(): Promise<Record<string, number>> {
    await expect(this.stageButtons.first()).toBeVisible();
    const entries = await this.stageButtons.evaluateAll((buttons) =>
      buttons.map((button) => [
        (button.getAttribute("data-testid") ?? "").replace("stage-filter-", ""),
        Number(button.textContent),
      ])
    );
    return Object.fromEntries(entries) as Record<string, number>;
  }
}
