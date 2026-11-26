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
