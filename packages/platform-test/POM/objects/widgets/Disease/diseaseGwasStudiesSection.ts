import type { Locator, Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";
import { SectionTable } from "../Drug/sectionTable";

/** Disease page: GWAS section, a server-side table of the disease's GWAS studies. */
export class DiseaseGwasStudiesSection {
  static readonly id = "gwasstudies";
  static readonly headers = [
    "Study",
    "Reported trait",
    "Sample size",
    "Cohorts",
    "Publication",
    "Credible sets count",
  ] as const;
  readonly section: Locator;
  readonly table: SectionTable;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, DiseaseGwasStudiesSection.id);
    this.table = new SectionTable(this.section);
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** Link of a study row, to its page. */
  studyLink(row: number): Locator {
    return this.table.cell(row, 0).getByRole("link");
  }

  /** The drawer the Publication cell opens. */
  get publicationsDrawer(): Locator {
    return this.page.getByTestId("publications-drawer");
  }
}
