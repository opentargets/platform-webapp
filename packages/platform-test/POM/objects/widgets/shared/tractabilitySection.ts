import type { Locator, Page } from "@playwright/test";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

export type TractabilityModalityKey = "sm" | "ab" | "pr" | "oc";

/**
 * The four modality columns, in the order the widget renders them, with the assessment
 * buckets each one always lists. The buckets are fixed by the tractability pipeline: a
 * target has the same buckets as any other, only their true/false value differs.
 */
export const TRACTABILITY_MODALITIES: readonly {
  key: TractabilityModalityKey;
  /** The `modality` value in the API */
  code: string;
  title: string;
  buckets: readonly string[];
}[] = [
  {
    key: "sm",
    code: "SM",
    title: "Small molecule",
    buckets: [
      "Advanced Clinical",
      "Approved Drug",
      "Druggable Family",
      "High-Quality Ligand",
      "High-Quality Pocket",
      "Med-Quality Pocket",
      "Phase 1 Clinical",
      "Structure with Ligand",
    ],
  },
  {
    key: "ab",
    code: "AB",
    title: "Antibody",
    buckets: [
      "Advanced Clinical",
      "Approved Drug",
      "GO CC high conf",
      "GO CC med conf",
      "Human Protein Atlas loc",
      "Phase 1 Clinical",
      "UniProt SigP or TMHMM",
      "UniProt loc high conf",
      "UniProt loc med conf",
    ],
  },
  {
    key: "pr",
    code: "PR",
    title: "PROTAC",
    buckets: [
      "Advanced Clinical",
      "Approved Drug",
      "Database Ubiquitination",
      "Half-life Data",
      "Literature",
      "Phase 1 Clinical",
      "Small Molecule Binder",
      "UniProt Ubiquitination",
    ],
  },
  {
    key: "oc",
    code: "OC",
    title: "Other modalities",
    buckets: ["Advanced Clinical", "Approved Drug", "Phase 1 Clinical"],
  },
];

/** The Tractability widget of the target profile page. */
export class TractabilitySection {
  static readonly id = "tractability";
  static readonly operation = "TargetTractabilityQuery";

  readonly section: Locator;
  readonly header: Locator;
  readonly description: Locator;
  readonly grid: Locator;

  constructor(private readonly page: Page) {
    this.section = sectionLocator(page, TractabilitySection.id);
    this.header = this.section.getByTestId("section-tractability-header");
    this.description = this.section.getByTestId("section-description");
    this.grid = this.section.getByTestId("tractability-grid");
  }

  /** Assert the section is rendered with data and has finished loading. */
  async expectLoaded(): Promise<void> {
    await expectSectionLoaded(this.page, TractabilitySection.id);
  }

  /** The four modality columns, in page order. */
  get modalityColumns(): Locator {
    return this.grid.locator("[data-testid^='tractability-modality-title-']");
  }

  modalityTitle(key: TractabilityModalityKey): Locator {
    return this.grid.getByTestId(`tractability-modality-title-${key}`);
  }

  modalityList(key: TractabilityModalityKey): Locator {
    return this.grid.getByTestId(`tractability-modality-list-${key}`);
  }

  /** Every assessment bucket of a modality, enabled or not, in page order. */
  items(key: TractabilityModalityKey): Locator {
    return this.modalityList(key).locator("[data-testid^='tractability-item-']");
  }

  enabledItems(key: TractabilityModalityKey): Locator {
    return this.modalityList(key).getByTestId("tractability-item-enabled");
  }

  disabledItems(key: TractabilityModalityKey): Locator {
    return this.modalityList(key).getByTestId("tractability-item-disabled");
  }

  /** One bucket of a modality by its exact label, whatever its state. */
  item(key: TractabilityModalityKey, label: string): Locator {
    return this.items(key).filter({ has: this.page.getByText(label, { exact: true }) });
  }
}
