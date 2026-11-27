import { expect, type Locator, type Page } from "@playwright/test";
import { sectionTestId } from "../../../utils/sections";

/** Section ids of the disease profile page that the shell tests know about. */
export const DISEASE_SECTIONS = [
  { id: "ontology", name: "Ontology" },
  { id: "drugs", name: "Drugs and Clinical Candidates" },
  { id: "phenotypes", name: "Clinical signs and symptoms" },
  { id: "gwasstudies", name: "GWAS" },
  { id: "bibliography", name: "Bibliography" },
] as const;

/**
 * The disease page shell, /disease/:efoId: the header above the tabs, the Associated
 * targets / Profile tabs, the profile header (description, synonyms), the summary chips
 * and the 404 page.
 *
 * Construct it after the page is on a disease URL when you use the URL helpers
 * (`getProfilePage`, `goToProfilePage`, `goToAssociationsPage`).
 */
export class DiseasePage {
  readonly originalURL: string;

  constructor(readonly page: Page) {
    this.originalURL = page.url();
  }

  // ------------------------------------------------------------------ navigation

  /** Open the profile tab of a disease and wait for its header. */
  async goto(efoId: string, suffix = ""): Promise<void> {
    await this.page.goto(`/disease/${efoId}${suffix}`);
    await this.waitForPageLoad();
  }

  /** Open the associated targets tab of a disease directly. */
  async gotoAssociations(efoId: string): Promise<void> {
    await this.page.goto(`/disease/${efoId}/associations`);
    await this.waitForPageLoad();
  }

  /** The profile URL of the disease this object was created on. */
  getProfilePage(): string {
    return this.originalURL.replace(/\/associations$/, "");
  }

  async goToProfilePage(): Promise<void> {
    await this.page.goto(this.getProfilePage());
  }

  async goToAssociationsPage(): Promise<void> {
    await this.page.goto(this.originalURL);
  }

  /** Wait for the header to show a disease name. */
  async waitForPageLoad(): Promise<void> {
    await expect(
      this.title,
      "the disease page header should show the disease name"
    ).not.toBeEmpty();
  }

  async openProfileTab(): Promise<void> {
    await this.profileTab.click();
  }

  async openAssociationsTab(): Promise<void> {
    await this.associationsTab.click();
  }

  // ---------------------------------------------------------------------- header

  /** The disease name in the page header. */
  get title(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  /** The line under the name with the EFO link and the cross references. */
  get externalLinks(): Locator {
    return this.page.getByTestId("external-links");
  }

  /** The EFO link in the header. */
  getEfoLink(): Locator {
    return this.externalLinks.locator('a[href*="ebi.ac.uk/ols4/ontologies/efo"]');
  }

  /** Every cross reference link in the header, across sources. */
  getXrefLinks(): Locator {
    return this.page.locator('[data-testid^="header-external-links-"] a');
  }

  /** The cross references of one source, e.g. "mesh" or "umls" (the lower-cased label). */
  xrefSource(source: string): Locator {
    return this.page.getByTestId(`header-external-links-${source}`);
  }

  /** The "show more" / "hide" control of a cross reference source with many ids. */
  xrefToggle(source: string): Locator {
    return this.xrefSource(source).getByText(/show more|hide/);
  }

  // ------------------------------------------------------------------------ tabs

  get tabs(): Locator {
    return this.page.getByRole("tab");
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile", exact: true });
  }

  get associationsTab(): Locator {
    return this.page.getByRole("tab", { name: "Associated targets", exact: true });
  }

  // -------------------------------------------------------------- profile header

  get profileHeader(): Locator {
    return this.page.getByTestId("profile-header");
  }

  get description(): Locator {
    return this.page.getByTestId("profile-description");
  }

  get synonyms(): Locator {
    return this.page.getByTestId("profile-synonyms");
  }

  get synonymChips(): Locator {
    return this.synonyms.locator("[data-testid^='chip-']");
  }

  synonymChip(label: string): Locator {
    return this.synonyms.getByTestId(`chip-${label}`);
  }

  get synonymsToggle(): Locator {
    return this.synonyms.getByTestId("long-list-toggle");
  }

  get tooltip(): Locator {
    return this.page.getByRole("tooltip");
  }

  // ------------------------------------------------------------------- sections

  section(sectionId: string): Locator {
    return this.page.getByTestId(sectionTestId(sectionId));
  }

  sectionTitle(sectionId: string): Locator {
    return this.page.getByTestId(`${sectionTestId(sectionId)}-header`);
  }

  /** The summary chip of a section, in the grid above the sections. */
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

  // ------------------------------------------------------------------ not found

  get notFound(): Locator {
    return this.page.getByTestId("not-found-page");
  }
}
