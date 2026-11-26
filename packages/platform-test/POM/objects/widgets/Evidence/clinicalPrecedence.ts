import { expect, type Locator, type Page } from "@playwright/test";
import { CLINICAL_STAGE_KEYS, CLINICAL_STAGE_LABELS } from "../../../page/drug/drugData";
import { waitForOperation } from "../shared/sectionDataControls";
import {
  EVIDENCE_PAGE_SIZE,
  type EvidenceList,
  type EvidencePair,
  GeneticEvidenceSection,
} from "./geneticEvidenceSection";

/** BRAF in melanoma: approved drugs and many trials, several pages of clinical precedence. */
export const BRAF_MELANOMA: EvidencePair & { symbol: string; name: string } = {
  ensgId: "ENSG00000157764",
  efoId: "MONDO_0005105",
  symbol: "BRAF",
  name: "melanoma",
};

/** Columns of the Clinical precedence table, in order. The direction header carries a help icon. */
export const CP_HEADERS = [
  "Report",
  "Disease/phenotype",
  "Targets",
  "Drug",
  "Direction of Effect?",
  "Stage",
  "Start Date",
] as const;
export const CP_COLUMN = {
  report: 0,
  disease: 1,
  targets: 2,
  drug: 3,
  direction: 4,
  stage: 5,
  startDate: 6,
} as const;
/** Columns the picker locks: everything up to and including the drug. */
export const CP_LOCKED = ["Report", "Disease/phenotype", "Targets", "Drug"] as const;

/** GraphQL operation behind the section (packages/sections/src/evidence/ClinicalPrecedence). */
export const CP_OPERATION = "ClinicalPrecedence";
export const CP_LIST = "clinical_precedence";

export type ClinicalPrecedenceRow = {
  disease: { id: string; name: string };
  target: { id: string; approvedSymbol: string };
  drug: {
    id: string;
    name: string;
    mechanismsOfAction: { rows: { targets: { id: string; approvedSymbol: string }[] }[] } | null;
  };
  directionOnTarget: string | null;
  directionOnTrait: string | null;
  clinicalStage: string;
  clinicalReportId: string | null;
  studyStartDate: string | null;
};

export type ClinicalReportDetail = {
  clinicalReport: {
    id: string;
    title: string | null;
    url: string | null;
    source: string;
    clinicalStage: string;
    trialStartDate: string | null;
    year: number | null;
    diseases: { diseaseFromSource: string | null; disease: { id: string; name: string } | null }[];
  };
};

/** The stage label the table shows for an API stage ("PHASE_1_2" is "Phase I/II"). */
export function stageLabel(apiStage: string): string {
  const index = CLINICAL_STAGE_KEYS.indexOf(
    apiStage.toLowerCase().replace(/_/g, "-") as (typeof CLINICAL_STAGE_KEYS)[number]
  );
  expect(index, `"${apiStage}" is a known clinical stage`).toBeGreaterThanOrEqual(0);
  return CLINICAL_STAGE_LABELS[index];
}

/** The year the Start Date column shows, or N/A for a study without a date. */
export function startYear(studyStartDate: string | null): string {
  return studyStartDate ? String(new Date(studyStartDate).getFullYear()) : "N/A";
}

/** The other targets of a drug's mechanisms of action, as the Targets column counts them. */
export function otherTargetIds(row: ClinicalPrecedenceRow): string[] {
  const others = new Set<string>();
  for (const mechanism of row.drug.mechanismsOfAction?.rows ?? []) {
    for (const target of mechanism.targets) if (target.id !== row.target.id) others.add(target.id);
  }
  return [...others];
}

/** The text of the Targets cell: the target's symbol, then how many other targets the drug hits. */
export function targetsText(row: ClinicalPrecedenceRow): string {
  const symbol =
    row.drug.mechanismsOfAction?.rows
      .flatMap((mechanism) => mechanism.targets)
      .find((target) => target.id === row.target.id)?.approvedSymbol ?? row.target.approvedSymbol;
  const others = otherTargetIds(row).length;
  return others > 0 ? `${symbol} and ${others} other target${others > 1 ? "s" : ""}` : symbol;
}

/** Evidence page > Clinical Precedence (section id "clinical_precedence"). */
export class ClinicalPrecedenceSection extends GeneticEvidenceSection {
  static readonly id = "clinical_precedence";

  constructor(page: Page) {
    super(page, ClinicalPrecedenceSection.id);
  }

  override get chip(): Locator {
    return this.section.getByText("Clinical", { exact: true });
  }

  reportButton(row: number): Locator {
    return this.cell(row, CP_COLUMN.report).getByTestId("clinical-record-drawer-trigger");
  }

  diseaseLink(row: number): Locator {
    return this.cell(row, CP_COLUMN.disease).getByRole("link");
  }

  targetLink(row: number): Locator {
    return this.cell(row, CP_COLUMN.targets).getByRole("link");
  }

  drugLink(row: number): Locator {
    return this.cell(row, CP_COLUMN.drug).getByRole("link");
  }

  directionIcons(row: number): Locator {
    return this.cell(row, CP_COLUMN.direction).locator("svg");
  }

  get directionHeaderHelp(): Locator {
    return this.table.headers.nth(CP_COLUMN.direction).locator("sup");
  }

  /** The report drawer, which is rendered in a portal outside the section. */
  get recordDrawer(): Locator {
    return this.page.getByTestId("clinical-record-drawer");
  }

  /** Hover the direction icons of a row and return the tooltip. */
  async openDirection(row: number): Promise<Locator> {
    await this.page.mouse.move(0, 0);
    await expect(this.tooltip, "an earlier tooltip should close").toHaveCount(0);
    await this.directionIcons(row).first().hover();
    await expect(this.tooltip).toBeVisible();
    return this.tooltip;
  }

  /**
   * Click the Report button of a row, wait for the report's details and assert the drawer
   * shows the report that belongs to that row.
   */
  async openReport(row: number, reportId: string): Promise<Locator> {
    const detail = waitForOperation<ClinicalReportDetail>(this.page, "RecordDetailQuery");
    await this.reportButton(row).click();
    const { data, variables } = await detail;
    expect(variables, "the drawer asks for the report of the clicked row").toMatchObject({
      clinicalReportId: reportId,
    });
    const report = data.clinicalReport;
    expect(report.id).toBe(reportId);
    const drawer = this.recordDrawer;
    await expect(drawer, "the report drawer should open").toBeVisible();
    await expect(drawer.getByText("Report", { exact: true }).first()).toBeVisible();
    await expect(
      drawer.getByText("Loading clinical report details"),
      "the drawer should finish loading"
    ).toHaveCount(0);
    await expect(
      drawer.getByText(report.title ?? "", { exact: true }),
      "the drawer shows the report of the row that was clicked"
    ).toBeVisible();
    return drawer;
  }

  async closeReport(): Promise<void> {
    await this.recordDrawer.getByTestId("drawer-close").click();
    await expect(this.recordDrawer, "the report drawer should close").toBeHidden();
  }
}

/** Open an evidence page and wait for the Clinical precedence section and its first page. */
export async function openClinicalPrecedence(
  page: Page,
  pair: EvidencePair = BRAF_MELANOMA
): Promise<{ section: ClinicalPrecedenceSection; list: EvidenceList<ClinicalPrecedenceRow> }> {
  const section = new ClinicalPrecedenceSection(page);
  const response = waitForOperation<{
    disease: Record<string, EvidenceList<ClinicalPrecedenceRow>>;
  }>(page, CP_OPERATION);
  await page.goto(`/evidence/${pair.ensgId}/${pair.efoId}`);
  const { data, variables } = await response;
  expect(variables, "the section asks for the first page of its target and disease").toMatchObject({
    ensemblId: pair.ensgId,
    efoId: pair.efoId,
    index: 0,
    size: EVIDENCE_PAGE_SIZE,
  });
  await section.expectLoaded();
  const list = data.disease[CP_LIST];
  expect(list.count, "the API has clinical precedence for this pair").toBeGreaterThan(0);
  expect(list.rows.length).toBe(Math.min(list.count, EVIDENCE_PAGE_SIZE));
  return { section, list };
}
