import type { Locator, Page } from "@playwright/test";
import { ProfileSection } from "./profileSection";

/**
 * Target page sections that render more than a plain table. Plain table
 * sections use `ProfileSection` directly.
 */

export class TractabilitySection extends ProfileSection {
  constructor(page: Page) {
    super(page, "tractability");
  }

  grid(): Locator {
    return this.root.getByTestId("tractability-grid");
  }

  /** Modality ids: sm (small molecule), ab (antibody), pr (PROTAC), oc (other) */
  modality(id: "sm" | "ab" | "pr" | "oc"): Locator {
    return this.root.getByTestId(`tractability-modality-${id}`);
  }

  enabledItems(modality: Locator): Locator {
    return modality.getByTestId("tractability-item-enabled");
  }

  disabledItems(modality: Locator): Locator {
    return modality.getByTestId("tractability-item-disabled");
  }
}

export class SubcellularLocationSection extends ProfileSection {
  constructor(page: Page) {
    super(page, "subcellularlocation");
  }

  tab(source: "hpa_main" | "hpa_additional" | "uniprot"): Locator {
    return this.root.getByTestId(`subcellular-tab-${source}`);
  }

  tabPanel(source: "hpa_main" | "hpa_additional" | "uniprot"): Locator {
    return this.root.getByTestId(`subcellular-tabpanel-${source}`);
  }

  visualization(): Locator {
    return this.root.getByTestId("subcellular-visualization");
  }

  locationItems(): Locator {
    return this.root.getByTestId("subcellular-location-item");
  }
}

export class MolecularInteractionsSection extends ProfileSection {
  constructor(page: Page) {
    super(page, "interactions");
  }

  tab(source: "intact" | "signor" | "reactome" | "string"): Locator {
    return this.root.getByTestId(`interactions-tab-${source}`);
  }

  content(source: "intact" | "signor" | "reactome" | "string"): Locator {
    return this.root.getByTestId(`interactions-content-${source}`);
  }
}

export class ComparativeGenomicsSection extends ProfileSection {
  constructor(page: Page) {
    super(page, "compgenomics");
  }

  chart(): Locator {
    return this.root.getByTestId("comparative-genomics-chart");
  }

  tableViewToggle(): Locator {
    return this.root.getByTestId("view-toggle-table");
  }
}

export class DepMapSection extends ProfileSection {
  constructor(page: Page) {
    super(page, "depmapessentiality");
  }

  plot(): Locator {
    return this.root.getByTestId("depmap-plot");
  }
}

export class BaselineExpressionSection extends ProfileSection {
  constructor(page: Page) {
    super(page, "baselineexpression");
  }

  tab(name: "Summary" | "Variation (GTEx)"): Locator {
    return this.root.getByRole("tab", { name });
  }

  summaryRows(): Locator {
    return this.root.locator("tbody tr");
  }
}

export class BibliographySection extends ProfileSection {
  constructor(page: Page) {
    super(page, "bibliography");
  }

  entries(): Locator {
    return this.root.locator("[data-testid^='literature-entry-']");
  }

  nextPage(): Locator {
    return this.root.getByRole("button", { name: "Go to next page" });
  }
}
