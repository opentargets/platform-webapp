import { expect, type Locator, type Page } from "@playwright/test";

/**
 * The widgets of the target profile, in the order the app renders them
 * (apps/platform/src/pages/TargetPage/Profile.tsx).
 *
 * - `id` is the widget definition id: the DOM id of the section and the URL hash.
 * - `section` is the section id used by fixtures/expectedSections.ts
 *   (the section's data-testid without "section-").
 * - `summary` is the data-testid of the summary chip.
 */
export const TARGET_WIDGETS = [
  {
    id: "drugs",
    section: "drugs",
    summary: "summary-drugs",
    name: "Drugs and Clinical Candidates",
    shortName: "DC",
  },
  {
    id: "tractability",
    section: "tractability",
    summary: "summary-tractability",
    name: "Tractability",
    shortName: "TR",
  },
  { id: "safety", section: "safety", summary: "summary-safety", name: "Safety", shortName: "S" },
  {
    id: "pharmacogenetics",
    section: "pharmacogenetics",
    summary: "summary-pharmacogenetics",
    name: "Pharmacogenetics",
    shortName: "PGx",
  },
  {
    id: "qtl_credible_sets",
    section: "qtl-credible-sets",
    summary: "summary-qtlcrediblesets",
    name: "molQTL Credible Sets",
    shortName: "QT",
  },
  {
    id: "chemicalProbes",
    section: "chemicalprobes",
    summary: "summary-chemicalprobes",
    name: "Chemical Probes",
    shortName: "CP",
  },
  {
    id: "baselineExpression",
    section: "baselineexpression",
    summary: "summary-baselineexpression",
    name: "Baseline Expression",
    shortName: "BE",
  },
  {
    id: "depMapEssentiality",
    section: "depmapessentiality",
    summary: "summary-depmapessentiality",
    name: "Cancer DepMap",
    shortName: "DM",
  },
  {
    id: "subcellularLocation",
    section: "subcellularlocation",
    summary: "summary-subcellularlocation",
    name: "Subcellular Location",
    shortName: "SL",
  },
  {
    id: "geneOntology",
    section: "geneontology",
    summary: "summary-geneontology",
    name: "Gene Ontology",
    shortName: "GO",
  },
  {
    id: "geneticConstraint",
    section: "geneticconstraint",
    summary: "summary-geneticconstraint",
    name: "Genetic Constraint",
    shortName: "GC",
  },
  {
    id: "molecularStructure",
    section: "molecularstructure",
    summary: "summary-molecularstructure",
    name: "Molecular Structure",
    shortName: "MS",
  },
  {
    id: "interactions",
    section: "interactions",
    summary: "summary-interactions",
    name: "Molecular Interactions",
    shortName: "MI",
  },
  {
    id: "pathways",
    section: "pathways",
    summary: "summary-pathways",
    name: "Pathways",
    shortName: "PW",
  },
  {
    id: "cancerHallmarks",
    section: "cancerhallmarks",
    summary: "summary-cancerhallmarks",
    name: "Cancer Hallmarks",
    shortName: "CH",
  },
  {
    id: "mousePhenotypes",
    section: "mousephenotypes",
    summary: "summary-mousephenotypes",
    name: "Mouse Phenotypes",
    shortName: "MP",
  },
  {
    id: "compGenomics",
    section: "compgenomics",
    summary: "summary-compgenomics",
    name: "Comparative Genomics",
    shortName: "CG",
  },
  {
    id: "bibliography",
    section: "bibliography",
    summary: "summary-bibliography",
    name: "Bibliography",
    shortName: "B",
  },
] as const;

export type TargetWidget = (typeof TARGET_WIDGETS)[number];

/** The widget with this section id. Throws for an id the target profile does not have. */
export function targetWidget(section: string): TargetWidget {
  const widget = TARGET_WIDGETS.find((candidate) => candidate.section === section);
  if (!widget) throw new Error(`The target profile has no widget with section id "${section}"`);
  return widget;
}

/**
 * The target page shell: the header above the tabs, the Associated diseases / Profile
 * tabs, the summary chips, the sticky header and the 404 page.
 *
 * Getters return Locators; methods act and assert the effect of the action.
 */
export class TargetPage {
  constructor(readonly page: Page) {}

  // ---------------------------------------------------------------- navigation

  /** Open the profile tab of a target and wait for its header. */
  async goto(ensgId: string): Promise<void> {
    await this.page.goto(`/target/${ensgId}`);
    await expect(this.symbol, "the target page header should render").toBeVisible();
  }

  /** Open the profile tab of a target at one of its sections, as a shared link would. */
  async gotoSection(ensgId: string, widgetId: string): Promise<void> {
    await this.page.goto(`/target/${ensgId}#${widgetId}`);
    await expect(this.symbol, "the target page header should render").toBeVisible();
  }

  /** Open the associated diseases tab of a target directly. */
  async gotoAssociations(ensgId: string): Promise<void> {
    await this.page.goto(`/target/${ensgId}/associations`);
    await expect(this.symbol, "the target page header should render").toBeVisible();
  }

  // -------------------------------------------------------------------- header

  get header(): Locator {
    return this.page.getByTestId("profile-page-header-block");
  }

  /** The approved symbol, the page's main title. */
  get symbol(): Locator {
    return this.page.getByTestId("profile-page-header-text");
  }

  /** The approved name, next to the symbol. */
  get name(): Locator {
    return this.header.getByRole("heading", { level: 5 });
  }

  get externalLinks(): Locator {
    return this.header.getByTestId("external-links");
  }

  /** The UniProt cross-references in the header (reviewed accessions only). */
  get uniprotLinks(): Locator {
    return this.externalLinks.getByTestId("header-external-links-uniprot");
  }

  /** The RNAcentral cross-reference in the header (non-coding targets only). */
  get rnacentralLinks(): Locator {
    return this.externalLinks.getByTestId("header-external-links-rnacentral");
  }

  // ---------------------------------------------------------------------- tabs

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile", exact: true });
  }

  get associationsTab(): Locator {
    return this.page.getByRole("tab", { name: "Associated diseases", exact: true });
  }

  /** Click the Associated diseases tab and assert the route and the selected tab changed. */
  async openAssociationsTab(ensgId: string): Promise<void> {
    await this.associationsTab.click();
    await expect(this.page).toHaveURL(new RegExp(`/target/${ensgId}/associations$`));
    await expect(this.associationsTab).toHaveAttribute("aria-selected", "true");
    await expect(this.profileTab).toHaveAttribute("aria-selected", "false");
  }

  /** Click the Profile tab and assert the route and the selected tab changed. */
  async openProfileTab(ensgId: string): Promise<void> {
    await this.profileTab.click();
    await expect(this.page).toHaveURL(new RegExp(`/target/${ensgId}$`));
    await expect(this.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(this.associationsTab).toHaveAttribute("aria-selected", "false");
  }

  // ------------------------------------------------------------- summary chips

  /** Every summary chip, in page order. */
  get summaryChips(): Locator {
    return this.page.locator("[data-testid^='summary-']");
  }

  summaryChip(widget: TargetWidget): Locator {
    return this.page.getByTestId(widget.summary);
  }

  /**
   * Assert which summary chips are active. A chip whose widget has data is clickable
   * (pointer cursor); one without data is greyed out and keeps the default cursor.
   */
  async expectActiveSummaryChips(sectionsWithData: readonly string[]): Promise<void> {
    for (const widget of TARGET_WIDGETS) {
      const hasData = sectionsWithData.includes(widget.section);
      await expect(
        this.summaryChip(widget),
        `summary chip "${widget.name}" should be ${hasData ? "active (the target has this data)" : "inactive (the target has no such data)"}`
      ).toHaveCSS("cursor", hasData ? "pointer" : "auto");
    }
  }

  /** Click a summary chip and assert the page scrolled to its section and recorded it in the URL. */
  async followSummaryChip(widget: TargetWidget): Promise<void> {
    await this.summaryChip(widget).click();
    await expect(this.page).toHaveURL(new RegExp(`#${widget.id}$`));
    await expect(
      this.page.getByTestId(`section-${widget.section}-header`),
      `the "${widget.name}" section should be scrolled into view`
    ).toBeInViewport();
  }

  // ------------------------------------------------------------- sticky header

  /** The bar pinned to the top once the tabs have scrolled out of view. */
  get stickyHeader(): Locator {
    return this.page.getByTestId("sticky-profile-header");
  }

  /** The control in the sticky header that names the section in view and opens the section menu. */
  get stickySectionSelector(): Locator {
    return this.stickyHeader.getByTestId("sticky-section-selector");
  }

  get stickySectionMenu(): Locator {
    return this.page.getByRole("menu");
  }

  get stickySectionFilter(): Locator {
    return this.page.getByPlaceholder("Filter widgets...");
  }

  // ----------------------------------------------------------------- not found

  get notFoundPage(): Locator {
    return this.page.getByTestId("not-found-page");
  }
}
