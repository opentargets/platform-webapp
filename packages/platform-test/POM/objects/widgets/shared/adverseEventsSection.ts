import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionTable } from "../Drug/sectionTable";

/** The first two headers; the third carries the critical value of the drug. */
export const ADVERSE_EVENTS_COLUMNS = [
  "Adverse event (MedDRA)",
  "Number of reported events",
] as const;

export const LLR_HEADER = /^Log likelihood ratio \(CV = (\d+\.\d{2})\)$/;

/** Column positions in the adverse events table. */
export const ADVERSE_EVENT_COLUMN = { name: 0, count: 1, llr: 2 } as const;

/** Drug page: Pharmacovigilance section (adverse events, a server-paginated table). */
export class AdverseEventsSection {
  static readonly id = "adverseevents";
  readonly section: Locator;
  readonly table: SectionTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, AdverseEventsSection.id);
    this.table = new SectionTable(this.section);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The header of the log likelihood ratio column, which states the critical value. */
  get llrHeader(): Locator {
    return this.table.headers.nth(ADVERSE_EVENT_COLUMN.llr);
  }
}
