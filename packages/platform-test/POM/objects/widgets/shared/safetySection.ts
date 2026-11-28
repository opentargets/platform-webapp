import { expect, type Locator, type Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";
import { SectionDataControls, SectionTable } from "./sectionDataControls";

/** Column order of the safety table. */
export const SAFETY_COLUMNS = [
  "Safety event",
  "Biosystems",
  "Dosing effects",
  "Experimental studies",
  "Source",
] as const;

const COLUMN = { event: 0, biosystems: 1, dosing: 2, studies: 3, source: 4 } as const;

export type SafetyLiability = {
  event: string | null;
  eventId: string | null;
  biosamples: {
    cellFormat: string | null;
    cellLabel: string | null;
    tissueLabel: string | null;
    tissueId: string | null;
  }[];
  effects: { dosing: string | null; direction: string }[];
  studies: { name: string | null; type: string | null; description: string | null }[];
  datasource: string;
  url: string | null;
  literature: string | null;
};

export type SafetyData = { target: { id: string; safetyLiabilities: SafetyLiability[] } };

/** The Safety widget of the target profile page. */
export class SafetySection {
  static readonly id = "safety";
  static readonly operation = "TargetSafetyQuery";

  readonly section: Locator;
  readonly header: Locator;
  readonly description: Locator;
  readonly table: SectionTable;
  readonly controls: SectionDataControls;

  constructor(private readonly page: Page) {
    this.section = sectionLocator(page, SafetySection.id);
    this.header = this.section.getByTestId("section-safety-header");
    this.description = this.section.getByTestId("section-description");
    this.table = new SectionTable(this.section);
    this.controls = new SectionDataControls(page, this.section);
  }

  /** Assert the section is rendered with data and has finished loading. */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, SafetySection.id);
    await expect(this.table.headers).toHaveText([...SAFETY_COLUMNS]);
  }

  /** The rows on the current page whose safety event is exactly `event`. */
  rowsForEvent(event: string): Locator {
    return this.table.rows.filter({
      has: this.page.locator("td:nth-child(1)").getByText(event, { exact: true }),
    });
  }

  eventCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.event);
  }

  biosystemsCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.biosystems);
  }

  dosingCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.dosing);
  }

  studiesCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.studies);
  }

  sourceCell(row: Locator): Locator {
    return row.locator("td").nth(COLUMN.source);
  }

  /** The arrow of one direction in a row's dosing cell, in the given state. */
  effectIcon(row: Locator, direction: "up" | "down", state: "active" | "inactive"): Locator {
    return this.dosingCell(row).getByTestId(`safety-effect-${direction}-${state}`);
  }

  /** The tooltip MUI renders in a portal while an element is hovered. */
  get tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }

  get studiesDrawer(): Locator {
    return this.page.getByTestId("safety-studies-drawer-panel");
  }

  get biosystemsDrawer(): Locator {
    return this.page.getByTestId("table-drawer-panel");
  }

  get publicationsDrawer(): Locator {
    return this.page.getByTestId("publications-drawer");
  }

  /** Open the experimental-studies drawer of a row and return its study cards. */
  async openStudies(row: Locator): Promise<Locator> {
    await this.studiesCell(row).getByTestId("safety-studies-drawer").click();
    await expect(this.studiesDrawer).toBeVisible();
    await expect(this.studiesDrawer).toContainText("Experimental studies");
    return this.studiesDrawer.getByTestId("safety-study");
  }

  async openBiosystems(row: Locator): Promise<Locator> {
    await this.biosystemsCell(row).getByTestId("table-drawer").click();
    await expect(this.biosystemsDrawer).toBeVisible();
    return this.biosystemsDrawer;
  }

  async openPublications(row: Locator): Promise<Locator> {
    await this.sourceCell(row).getByTestId("publications-drawer-trigger").click();
    await expect(this.publicationsDrawer).toBeVisible();
    await expect(this.publicationsDrawer).toContainText("Publications");
    return this.publicationsDrawer;
  }

  /** Close a drawer with its close button and assert it is gone. */
  async closeDrawer(drawer: Locator): Promise<void> {
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  }
}
