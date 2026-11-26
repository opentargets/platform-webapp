import { expect, type Locator, type Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "../shared/sectionDataControls";

/**
 * Clinical stages in the order of the stage filter, least to most advanced, with the label
 * the app shows (clinicalStageCategories in @ot/constants).
 */
export const CLINICAL_STAGES = [
  { key: "UNKNOWN", label: "Unknown" },
  { key: "PRECLINICAL", label: "Preclinical" },
  { key: "IND", label: "IND" },
  { key: "EARLY_PHASE_1", label: "Early phase I" },
  { key: "PHASE_1", label: "Phase I" },
  { key: "PHASE_1_2", label: "Phase I/II" },
  { key: "PHASE_2", label: "Phase II" },
  { key: "PHASE_2_3", label: "Phase II/III" },
  { key: "PHASE_3", label: "Phase III" },
  { key: "PREAPPROVAL", label: "Preapproval" },
  { key: "APPROVAL", label: "Approval" },
  { key: "PHASE_4", label: "Phase IV" },
  { key: "WITHDRAWAL", label: "Withdrawal" },
] as const;

export type ClinicalStageKey = (typeof CLINICAL_STAGES)[number]["key"];

export function stageIndex(stage: string): number {
  const index = CLINICAL_STAGES.findIndex(({ key }) => key === stage);
  if (index === -1) throw new Error(`Unknown clinical stage "${stage}"`);
  return index;
}

export function stageLabel(stage: string): string {
  return CLINICAL_STAGES[stageIndex(stage)].label;
}

export type TargetDrugRow = {
  id: string;
  maxClinicalStage: ClinicalStageKey;
  drug: { id: string; name: string };
  clinicalReports: { id: string }[];
};

export type TargetDrugsData = {
  target: { drugAndClinicalCandidates: { count: number; rows: TargetDrugRow[] } };
};

/** The variables the drugs query is sent with: the table pages and sorts on the server. */
export type TargetDrugsVariables = {
  ensemblId: string;
  index: number;
  size: number;
  sort: { key: string; direction: string }[];
  search?: { text: string; fields: string[] };
};

/** How many drug cards a page holds (DRUGS_PAGE_SIZE in packages/sections/src/target/Drugs). */
export const DRUGS_PAGE_SIZE = 10;

export type ClinicalRecord = {
  id: string;
  clinicalStage: ClinicalStageKey;
  source: string;
  title: string | null;
  trialOverallStatus: string | null;
  trialStartDate: string | null;
  type: string | null;
  year: number | null;
};

export type ClinicalRecordsData = { clinicalReports: ClinicalRecord[] };

/** What a drug card's report counter reads. */
export const reportsLabel = (count: number) => `${count} ${count > 1 ? "reports" : "report"}`;

/**
 * The "Drugs and Clinical Candidates" widget of the TARGET profile page
 * (packages/sections/src/target/Drugs): a list of drug cards on the left and, for the
 * selected drug, its clinical reports by stage on the right.
 */
export class TargetDrugsSection {
  static readonly id = "drugs";
  static readonly operation = "TargetDrugsQuery";
  static readonly recordsOperation = "ClinicalRecordsQuery";
  static readonly recordDetailOperation = "RecordDetailQuery";

  readonly section: Locator;
  readonly header: Locator;
  readonly description: Locator;

  /** The drug cards (left). */
  readonly cards: Locator;
  readonly selectedCards: Locator;
  readonly searchInput: Locator;
  readonly cardsControls: SectionDataControls;
  /** The cards' pagination ("1 - 10 of 26" and the four buttons). */
  readonly cardsPagination: SectionTable;

  /** The clinical reports of the selected drug (right). */
  readonly records: Locator;
  readonly recordsSummary: Locator;
  readonly recordsTable: SectionTable;
  readonly recordsControls: SectionDataControls;
  readonly recordItems: Locator;

  constructor(private readonly page: Page) {
    this.section = sectionLocator(page, TargetDrugsSection.id);
    this.header = this.section.getByTestId("section-drugs-header");
    this.description = this.section.getByTestId("section-description");

    this.cards = this.section.getByTestId("drug-card");
    this.selectedCards = this.section.locator("[data-testid='drug-card'][data-selected='true']");
    this.searchInput = this.section.getByTestId("table-search-input");
    // the cards' export / API query pair comes first in the section, the reports' second
    this.cardsControls = new SectionDataControls(page, this.section, 0);
    // the OtTableServer block that holds the cards: the innermost block with both the search
    // box and the cards, so it excludes the reports' own table
    this.cardsPagination = new SectionTable(
      this.section
        .locator("div")
        .filter({ has: page.getByTestId("table-search-input") })
        .filter({ has: page.getByTestId("drug-card") })
        .last()
    );

    this.records = this.section.getByTestId("clinical-records");
    this.recordsSummary = this.records.getByTestId("clinical-records-summary");
    this.recordsTable = new SectionTable(this.records);
    this.recordsControls = new SectionDataControls(page, this.records);
    this.recordItems = this.records.getByTestId("clinical-record");
  }

  /** Assert the section is rendered, loaded, and shows cards and a selected drug's reports. */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, TargetDrugsSection.id);
    await expect(this.cards.first()).toBeVisible();
    await expect(this.recordsSummary).toBeVisible();
  }

  /** The card of the drug with exactly this name. */
  card(drugName: string): Locator {
    return this.cards.filter({ has: this.page.getByRole("link", { name: drugName, exact: true }) });
  }

  /** Name, max stage and report count of every card on screen, read back from the cards. */
  async cardDetails(): Promise<{ name: string; stage: ClinicalStageKey; reports: number }[]> {
    const texts = await this.cards.allInnerTexts();
    return texts.map((text) => {
      const match = /^(.+?)\s*Max stage:\s*(.+?)\s*(\d+) reports?$/s.exec(text.trim());
      expect(match, `the card "${text}" should read name, max stage and report count`).not.toBeNull();
      const [, name, label, reports] = match as RegExpExecArray;
      const stage = CLINICAL_STAGES.find((candidate) => candidate.label === label);
      expect(stage, `"${label}" should be a clinical stage label`).toBeDefined();
      return { name, stage: (stage as { key: ClinicalStageKey }).key, reports: Number(reports) };
    });
  }

  cardLink(card: Locator): Locator {
    return card.getByRole("link");
  }

  /** The circle of one stage in the stage filter: a button when the stage has reports. */
  stage(stage: ClinicalStageKey): Locator {
    return this.records.getByTestId(`stage-filter-${stage.toLowerCase().replace(/_/g, "-")}`);
  }

  get selectedStages(): Locator {
    return this.records.locator("[data-testid^='stage-filter-'][data-selected='true']");
  }

  /** The title button of a report, which opens its drawer. */
  recordTitle(record: Locator): Locator {
    return record.getByTestId("clinical-record-drawer-trigger");
  }

  get recordDrawer(): Locator {
    return this.page.getByTestId("clinical-record-drawer");
  }

  /**
   * Start waiting for the response of the drugs query that satisfies `matches`, which gets
   * the variables the page sent. Call it BEFORE the action that issues the query.
   */
  async waitForPage(
    matches: (variables: TargetDrugsVariables) => boolean
  ): Promise<{ data: TargetDrugsData; variables: TargetDrugsVariables }> {
    const response = await this.page.waitForResponse(
      (candidate) => {
        const body = candidate.request().postData();
        if (candidate.request().method() !== "POST" || !body?.includes('"query"')) return false;
        const request = JSON.parse(body) as {
          operationName?: string;
          variables?: TargetDrugsVariables;
        };
        return request.operationName === TargetDrugsSection.operation && !!request.variables &&
          matches(request.variables);
      },
      { timeout: 60_000 }
    );
    expect(response.status(), "the drugs query should answer with HTTP 200").toBe(200);
    const body = (await response.json()) as { data: TargetDrugsData; errors?: unknown[] };
    expect(body.errors, "the drugs query should not return GraphQL errors").toBeUndefined();
    const variables = JSON.parse(response.request().postData() ?? "{}").variables;
    return { data: body.data, variables };
  }

  /** Select a drug and wait until the right-hand side shows that drug's reports. */
  async selectDrug(row: TargetDrugRow): Promise<void> {
    const card = this.card(row.drug.name);
    // click the card body, not the drug link (which navigates to the drug page)
    await card.getByText("Max stage:").click();
    await expect(card).toHaveAttribute("data-selected", "true");
    await expect(this.selectedCards).toHaveCount(1);
    await expect(this.recordsSummary).toHaveText(
      `${reportsLabel(row.clinicalReports.length)} for ${row.drug.name}`
    );
  }

  /** Select a stage that has reports and wait until the filter marks it selected. */
  async selectStage(stage: ClinicalStageKey): Promise<void> {
    await this.stage(stage).click();
    await expect(this.stage(stage)).toHaveAttribute("data-selected", "true");
    await expect(this.selectedStages).toHaveCount(1);
  }

  async openRecord(record: Locator): Promise<Locator> {
    await this.recordTitle(record).click();
    await expect(this.recordDrawer).toBeVisible();
    await expect(this.recordDrawer).toContainText("Report");
    return this.recordDrawer;
  }

  async closeRecordDrawer(): Promise<void> {
    await this.recordDrawer.getByTestId("drawer-close").click();
    await expect(this.recordDrawer).toBeHidden();
  }
}
