import { expect, type Locator, type Page } from "@playwright/test";
import { ProfileSection } from "../Target/sectionWidgets";

export type SubcellularSource = "hpa_main" | "hpa_additional" | "hpa_extracellular_location" | "uniprot";

/** The SwissBioPics endpoint the cell diagram is downloaded from. */
export const SWISSBIOPICS_API = /^https:\/\/www\.swissbiopics\.org\/+api\/9606\/sl\/[\d,]+$/;

/**
 * Subcellular Location section of the target profile: one tab per data source, each with
 * a SwissBioPics cell diagram and the list of locations it highlights.
 */
export class SubcellularLocationSection extends ProfileSection {
  static readonly SOURCE_LABELS: Record<SubcellularSource, string> = {
    hpa_main: "HPA main location",
    hpa_additional: "HPA additional location",
    hpa_extracellular_location: "HPA extracellular location",
    uniprot: "UniProt",
  };

  constructor(page: Page) {
    super(page, "subcellularlocation");
  }

  get tabList(): Locator {
    return this.section.getByRole("tablist", { name: "Subcellular location sources" });
  }

  get tabs(): Locator {
    return this.tabList.getByRole("tab");
  }

  tab(source: SubcellularSource): Locator {
    return this.section.getByTestId(`subcellular-tab-${source}`);
  }

  panel(source: SubcellularSource): Locator {
    return this.section.getByTestId(`subcellular-tabpanel-${source}`);
  }

  /** The heading above the list of locations: the name of the source. */
  panelHeading(source: SubcellularSource): Locator {
    return this.panel(source).getByRole("heading", { level: 6 });
  }

  /** The "Location for <id>" link to the source's record for this target. */
  sourceRecordLink(source: SubcellularSource): Locator {
    return this.panel(source).getByRole("link");
  }

  locationsList(source: SubcellularSource): Locator {
    return this.panel(source).getByTestId("subcellular-locations-list");
  }

  locations(source: SubcellularSource): Locator {
    return this.locationsList(source).getByTestId("subcellular-location-item");
  }

  location(source: SubcellularSource, name: string): Locator {
    return this.locations(source).filter({ hasText: new RegExp(`^${escapeRegExp(name)}$`) });
  }

  /** The area holding the cell diagram and its loading or error message. */
  visualization(source: SubcellularSource): Locator {
    return this.panel(source).getByTestId("subcellular-visualization");
  }

  /** The SwissBioPics drawing itself. */
  diagram(source: SubcellularSource): Locator {
    return this.panel(source).getByTestId("subcellular-cell-diagram").locator("svg");
  }

  /** The part of the drawing for a UniProt subcellular location term, e.g. "0091" for SL-0091. */
  cellPart(source: SubcellularSource, termCode: string): Locator {
    return this.diagram(source).locator(`#SL${termCode}`);
  }

  /** Parts of the drawing the picture service marked as locations of this target. */
  highlightedParts(source: SubcellularSource): Locator {
    return this.diagram(source).locator(".subcell_present");
  }

  /** Assert a source's tab is the selected one and only its panel is shown. */
  async expectActive(source: SubcellularSource): Promise<void> {
    await expect(this.tab(source)).toHaveAttribute("aria-selected", "true");
    await expect(this.tabs.and(this.page.locator("[aria-selected='true']"))).toHaveCount(1);
    await expect(this.panel(source)).toBeVisible();
    await expect(
      this.section.getByTestId("subcellular-locations-list"),
      "only the selected source's locations should be rendered"
    ).toHaveCount(1);
    await expect(this.locationsList(source)).toBeVisible();
    await expect(this.panelHeading(source)).toHaveText(
      SubcellularLocationSection.SOURCE_LABELS[source]
    );
  }

  /** Assert the cell diagram of a source finished downloading and was drawn. */
  async expectDiagramDrawn(source: SubcellularSource): Promise<void> {
    await expect(
      this.visualization(source).getByText("Loading cell diagram ..."),
      "the cell diagram should finish loading"
    ).toHaveCount(0);
    await expect(
      this.visualization(source).getByText("Problem downloading cell diagram"),
      "the cell diagram should download"
    ).toHaveCount(0);
    await expect(this.diagram(source)).toBeVisible();
    await expect(
      this.diagram(source).locator("path").first(),
      "the diagram should contain drawing"
    ).toBeAttached();
  }

  /** The names in a source's list, in display order. */
  async locationNames(source: SubcellularSource): Promise<string[]> {
    return (await this.locations(source).allInnerTexts()).map((text) => text.trim());
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
