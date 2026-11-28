import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionTable } from "../Drug/sectionTable";

const CARD_TEXT = /^(.+?)\s*Max stage:\s*(.+?)\s*(\d+) reports?$/s;
const SUMMARY_TEXT = /^(\d+) reports? for (.+)$/s;

export type IndicationCard = {
  /** Disease name */
  name: string;
  /** Disease id, from the card's link */
  diseaseId: string;
  /** Label of the indication's maximum clinical stage */
  stage: string;
  /** Number of clinical reports */
  reports: number;
};

/**
 * Drug page: Indications section. A master-detail layout: the list of indications on
 * the left (a server-paginated, server-searched table of cards), and on the right the
 * clinical reports of the selected indication, filtered by clinical stage.
 */
export class IndicationsSection {
  static readonly id = "indications";
  readonly section: Locator;
  /** The list of indications. */
  readonly master: SectionTable;
  /** The clinical reports of the selected indication. */
  readonly records: SectionTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, IndicationsSection.id);
    this.master = new SectionTable(this.section, 0);
    this.records = new SectionTable(this.recordsPanel, 0);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The indication cards of the current page. */
  get cards(): Locator {
    return this.section.getByTestId("indication-card");
  }

  card(index: number): Locator {
    return this.cards.nth(index);
  }

  /** The card whose reports the detail panel shows. */
  get selectedCard(): Locator {
    return this.section.locator("[data-testid='indication-card'][data-selected='true']");
  }

  /** The detail panel: summary line, stage filter and reports. */
  get recordsPanel(): Locator {
    return this.section.getByTestId("clinical-records");
  }

  /** "277 reports for breast cancer" */
  get recordsSummary(): Locator {
    return this.section.getByTestId("clinical-records-summary");
  }

  /** Every slot of the stage filter, with or without reports. */
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

  /** The reports of the selected stage on the current page. */
  get recordRows(): Locator {
    return this.recordsPanel.getByTestId("clinical-record");
  }

  /** The title of a report; clicking it opens the report drawer. */
  recordTitle(index: number): Locator {
    return this.recordRows.nth(index).getByTestId("clinical-record-drawer-trigger");
  }

  get recordDrawer(): Locator {
    return this.page.getByTestId("clinical-record-drawer");
  }

  /** Assert the list shows `count` indication cards and has finished loading. */
  async expectCards(count: number): Promise<void> {
    await expect(this.cards, `the list should show ${count} indication(s)`).toHaveCount(count);
    await expect(
      this.master.table.locator(".MuiSkeleton-root"),
      "the list should finish loading"
    ).toHaveCount(0);
  }

  /** Read one card after asserting it has the full card layout. */
  async cardInfo(index: number): Promise<IndicationCard> {
    const card = this.card(index);
    await expect(card, "an indication card shows name, max stage and report count").toHaveText(
      CARD_TEXT
    );
    const link = card.getByRole("link");
    await expect(link).toHaveAttribute("href", /^\/disease\/[A-Za-z]+_\d+$/);
    const href = (await link.getAttribute("href")) ?? "";
    const match = CARD_TEXT.exec((await card.innerText()).trim());
    if (!match) throw new Error(`indication card ${index} changed while it was being read`);
    return {
      name: match[1].trim(),
      diseaseId: href.replace("/disease/", ""),
      stage: match[2].trim(),
      reports: Number(match[3]),
    };
  }

  /** Read every card of the current page. */
  async allCards(): Promise<IndicationCard[]> {
    const count = await this.cards.count();
    const cards: IndicationCard[] = [];
    for (let index = 0; index < count; index++) cards.push(await this.cardInfo(index));
    return cards;
  }

  /**
   * Assert the detail panel shows the reports of this indication: the summary line
   * names it with its report count and links to its disease page, and the reports
   * have loaded.
   */
  async expectDetailFor(card: IndicationCard): Promise<void> {
    await expect(
      this.recordsSummary,
      `the detail panel should show the reports of "${card.name}"`
    ).toHaveText(`${card.reports} ${card.reports > 1 ? "reports" : "report"} for ${card.name}`);
    await expect(this.recordsSummary.getByRole("link", { name: card.name })).toHaveAttribute(
      "href",
      `/disease/${card.diseaseId}`
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

  /** The test-id suffix of the selected stage. */
  async selectedStageKey(): Promise<string> {
    await expect(this.selectedStage).toHaveCount(1);
    const testId = (await this.selectedStage.getAttribute("data-testid")) ?? "";
    return testId.replace("stage-filter-", "");
  }

  /** The summary line parsed into its count and disease name. */
  async summary(): Promise<{ reports: number; name: string }> {
    await expect(this.recordsSummary).toHaveText(SUMMARY_TEXT);
    const match = SUMMARY_TEXT.exec((await this.recordsSummary.innerText()).trim());
    if (!match) throw new Error("the reports summary changed while it was being read");
    return { reports: Number(match[1]), name: match[2].trim() };
  }
}
