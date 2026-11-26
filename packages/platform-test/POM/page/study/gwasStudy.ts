import { expect, type Locator, type Page } from "@playwright/test";
import { sectionTestId } from "../../../utils/sections";

/** Section ids of the GWAS study profile page, in the order the page renders them. */
export const GWAS_STUDY_SECTIONS = [
  { id: "gwas-credible-sets", name: "GWAS Credible Sets", shortName: "GW", anchor: "gwas_credible_sets" },
  { id: "shared-trait-studies", name: "Shared Trait Studies", shortName: "ST", anchor: "shared_trait_studies" },
] as const;

/** The study profile page, /study/:studyId. */
export class GwasStudyPage {
  constructor(readonly page: Page) {}

  /** Open a study page and wait for its header to show the study id. */
  async goto(studyId: string, suffix = ""): Promise<void> {
    await this.page.goto(`/study/${studyId}${suffix}`);
    await expect(this.title, "the study page header should show the study id").toHaveText(studyId);
  }

  /** The study id in the page header. */
  get title(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile" });
  }

  /** Links under the title: "Disease or phenotype" and "Source". */
  get externalLinks(): Locator {
    return this.page.getByTestId("external-links");
  }

  get diseaseLinks(): Locator {
    return this.traitLinks("Disease or phenotype");
  }

  /** The disease links under the title. GWAS Catalog studies label them "Disease or phenotype", FinnGen ones "Trait". */
  traitLinks(label: "Disease or phenotype" | "Trait"): Locator {
    return this.page
      .getByTestId(`header-external-links-${label.toLowerCase().replace(/ /g, "-")}`)
      .getByRole("link");
  }

  sourceLink(label: string): Locator {
    return this.externalLinks.getByRole("link", { name: label, exact: true });
  }

  section(sectionId: string): Locator {
    return this.page.getByTestId(sectionTestId(sectionId));
  }

  sectionTitle(sectionId: string): Locator {
    return this.page.getByTestId(`${sectionTestId(sectionId)}-header`);
  }

  /** The summary card of a section: its testid is the definition id without underscores. */
  summaryCard(anchor: string): Locator {
    return this.page.getByTestId(`summary-${anchor.replace(/_/g, "")}`);
  }

  get summaryCards(): Locator {
    return this.page.locator("[data-testid^='summary-']");
  }

  get stickyHeader(): Locator {
    return this.page.getByTestId("sticky-profile-header");
  }

  get notFound(): Locator {
    return this.page.getByTestId("not-found-page");
  }
}
