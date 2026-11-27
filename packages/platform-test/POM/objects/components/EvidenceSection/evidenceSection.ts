import { expect, type Locator, type Page } from "@playwright/test";
import { SECTION_LOAD_TIMEOUT, sectionTestId } from "../../../../utils/sections";
import { OtTable } from "../../../../utils/table";

const LOADING_INDICATORS =
  ".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root, [data-testid='section-loader']";
const SECTION_ERRORS = "[data-testid='section-error'], [data-testid='error-boundary']";

/**
 * The detail panel the associations table opens under a row when a cell is clicked
 * (SectionRender.tsx). It wraps one widget: an evidence widget in the associations view,
 * a target profile widget in the prioritisation view.
 *
 * The wrapper (`evidence-section-<panelKey>`) is rendered as soon as the cell is clicked,
 * but the widget inside renders nothing when its query fails or returns no data. So an
 * open wrapper proves nothing: `expectLoaded` asserts the widget itself.
 */
export class EvidencePanel {
  readonly root: Locator;

  /**
   * @param scope the associations table (or the page)
   * @param panelKey the column id in the associations view, the column's `sectionId` in
   *   the prioritisation view
   */
  constructor(
    scope: Locator | Page,
    readonly panelKey: string
  ) {
    this.root = scope.getByTestId(`evidence-section-${panelKey}`);
  }

  /** The widget inside the panel, by its definition id. */
  section(sectionId: string): Locator {
    return this.root.getByTestId(sectionTestId(sectionId));
  }

  title(sectionId: string): Locator {
    return this.root.getByTestId(`${sectionTestId(sectionId)}-header`);
  }

  get description(): Locator {
    return this.root.getByTestId("section-description");
  }

  /** A table of the widget (OtTable). */
  table(index = 0): OtTable {
    return new OtTable(this.root, index);
  }

  /**
   * Assert the panel is open and its widget has loaded data: rendered, no loader, no
   * error, not the "No data available" placeholder, and titled.
   */
  async expectLoaded(sectionId: string): Promise<Locator> {
    await expect(this.root, `the "${this.panelKey}" panel should open under the row`).toBeVisible({
      timeout: SECTION_LOAD_TIMEOUT,
    });
    const section = this.section(sectionId);
    await expect(
      section,
      `the "${sectionId}" widget should render inside the "${this.panelKey}" panel. An empty panel means its query failed or returned no data for a cell that has a score.`
    ).toBeVisible({ timeout: SECTION_LOAD_TIMEOUT });
    await expect(
      this.root.locator(LOADING_INDICATORS),
      `the "${sectionId}" widget should finish loading`
    ).toHaveCount(0, { timeout: SECTION_LOAD_TIMEOUT });
    await expect(
      this.root.locator(SECTION_ERRORS),
      `the "${sectionId}" widget should not show an error`
    ).toHaveCount(0);
    await expect(
      this.root.getByTestId("section-no-data"),
      `the "${sectionId}" widget should show data, not the empty placeholder`
    ).toHaveCount(0);
    await expect(
      this.title(sectionId),
      `the "${sectionId}" widget should have a title`
    ).not.toBeEmpty();
    return section;
  }

  async expectClosed(): Promise<void> {
    await expect(this.root, `the "${this.panelKey}" panel should be closed`).toHaveCount(0);
  }
}
