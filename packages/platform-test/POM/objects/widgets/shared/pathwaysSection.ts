import type { Locator, Page } from "@playwright/test";
import { ProfileSection, TableControls } from "../Target/sectionWidgets";

/** Pathways section of the target profile: the Reactome pathways the target takes part in. */
export class PathwaysSection extends ProfileSection {
  static readonly COLUMNS = ["Pathway", "Top-level parent pathway", "View target and pathway"];

  readonly controls: TableControls;

  constructor(page: Page) {
    super(page, "pathways");
    this.controls = new TableControls(page, this.section);
  }

  /** The pathway name, linking to the pathway on identifiers.org. */
  pathwayLink(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 0).getByRole("link");
  }

  topLevelPathway(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 1);
  }

  /** The link that opens the pathway in the Reactome browser with the target flagged. */
  browserLink(rowIndex: number): Locator {
    return this.controls.table.cell(rowIndex, 2).getByRole("link");
  }
}
