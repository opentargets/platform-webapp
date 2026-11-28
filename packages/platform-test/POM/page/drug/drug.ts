import { expect, type Locator, type Page } from "@playwright/test";
import { sectionTestId } from "../../../utils/sections";

/** Section ids of the drug profile page, in the order the page renders them. */
export const DRUG_SECTIONS = [
  {
    id: "mechanismsofaction",
    name: "Mechanisms of Action",
    shortName: "MA",
    anchor: "mechanismsOfAction",
  },
  { id: "indications", name: "Indications", shortName: "I", anchor: "Indications" },
  { id: "drugwarnings", name: "Drug Warnings", shortName: "DW", anchor: "drugWarnings" },
  {
    id: "pharmacogenetics",
    name: "Pharmacogenetics",
    shortName: "PGx",
    anchor: "pharmacogenetics",
  },
  { id: "adverseevents", name: "Pharmacovigilance", shortName: "PV", anchor: "adverseEvents" },
  { id: "bibliography", name: "Bibliography", shortName: "B", anchor: "bibliography" },
] as const;

/** The drug profile page, /drug/:chemblId. */
export class DrugPage {
  constructor(readonly page: Page) {}

  /**
   * Open a drug page and wait for its header to show a name. `suffix` is appended to
   * the path, for deep links such as `#bibliography`.
   */
  async goto(chemblId: string, suffix = ""): Promise<void> {
    await this.page.goto(`/drug/${chemblId}${suffix}`);
    await expect(this.title, "the drug page header should show the drug name").not.toBeEmpty();
  }

  /** The drug name in the page header. */
  get title(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile" });
  }

  section(sectionId: string): Locator {
    return this.page.getByTestId(sectionTestId(sectionId));
  }

  sectionTitle(sectionId: string): Locator {
    return this.page.getByTestId(`${sectionTestId(sectionId)}-header`);
  }

  sectionDescription(sectionId: string): Locator {
    return this.section(sectionId).getByTestId("section-description");
  }

  /** The summary card of a section, in the grid above the sections. */
  summaryCard(sectionId: string): Locator {
    return this.page.getByTestId(`summary-${sectionId}`);
  }

  get summaryCards(): Locator {
    return this.page.locator("[data-testid^='summary-']");
  }

  /** The bar that sticks to the top once the page is scrolled past the tabs. */
  get stickyHeader(): Locator {
    return this.page.getByTestId("sticky-profile-header");
  }

  get notFound(): Locator {
    return this.page.getByTestId("not-found-page");
  }
}
