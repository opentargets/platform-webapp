import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Strict helpers for profile-page sections ("widgets").
 *
 * The app does not render a section whose query returned no data, and it also does not
 * render one whose query failed. So "the section is missing" must never be treated as
 * "nothing to test": for a known entity, the sections listed in
 * `fixtures/expectedSections.ts` have to be there, loaded, and free of error UI.
 */

/** How long a section may take to go from mounted to fully rendered. */
export const SECTION_LOAD_TIMEOUT = 45_000;

const LOADING_INDICATORS =
  ".MuiSkeleton-root, .MuiCircularProgress-root, .MuiLinearProgress-root, [data-testid='section-loader']";
const SECTION_ERRORS = "[data-testid='section-error'], [data-testid='error-boundary']";

/** The data-testid the app gives a section, from its definition id. */
export function sectionTestId(sectionId: string): string {
  return `section-${sectionId.toLowerCase().replace(/_/g, "-")}`;
}

export function sectionLocator(page: Page, sectionId: string): Locator {
  return page.getByTestId(sectionTestId(sectionId));
}

/**
 * Assert a section is on the page, has finished loading and shows content rather than an
 * error or the "No data available" placeholder. Scrolls it into view first, because
 * sections below the fold mount lazily.
 */
export async function expectSectionLoaded(page: Page, sectionId: string): Promise<Locator> {
  const section = sectionLocator(page, sectionId);
  await expect(
    section,
    `section "${sectionId}" should be rendered. If it is missing, either its query failed or the test entity no longer has this data.`
  ).toBeVisible({ timeout: SECTION_LOAD_TIMEOUT });
  await section.scrollIntoViewIfNeeded();
  await expect(
    section.locator(LOADING_INDICATORS),
    `section "${sectionId}" should finish loading`
  ).toHaveCount(0, { timeout: SECTION_LOAD_TIMEOUT });
  await expect(
    section.locator(SECTION_ERRORS),
    `section "${sectionId}" should not show an error`
  ).toHaveCount(0);
  await expect(
    section.getByTestId("section-no-data"),
    `section "${sectionId}" should show data, not the empty placeholder`
  ).toHaveCount(0);
  await expect(
    section.getByTestId(`${sectionTestId(sectionId)}-header`),
    `section "${sectionId}" should have a title`
  ).not.toBeEmpty();
  return section;
}

/** Wait until no section on the page is still loading. Fails if one never settles. */
export async function expectAllSectionsSettled(page: Page): Promise<void> {
  await expect(
    page.locator("section[data-testid^='section-']").locator(LOADING_INDICATORS),
    "every section should finish loading"
  ).toHaveCount(0, { timeout: SECTION_LOAD_TIMEOUT });
  await expect(page.getByTestId("section-loader"), "no section should still be mounting").toHaveCount(
    0,
    { timeout: SECTION_LOAD_TIMEOUT }
  );
}

/** The ids (data-testid minus the "section-" prefix) of the sections currently rendered. */
export async function renderedSectionIds(page: Page): Promise<string[]> {
  const testIds = await page
    .locator("section[data-testid^='section-']")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-testid") ?? ""));
  return testIds
    .filter((testId) => testId !== "section-loader")
    .map((testId) => testId.replace(/^section-/, ""))
    .sort();
}

/**
 * Assert the page renders exactly the expected set of sections: none missing (a broken
 * or emptied query) and none unexpected (new data the manifest should record).
 */
export async function expectSections(page: Page, expected: readonly string[]): Promise<void> {
  const wanted = expected.map((id) => sectionTestId(id).replace(/^section-/, "")).sort();
  for (const id of wanted) {
    await expect(
      page.getByTestId(`section-${id}`),
      `section "${id}" should be rendered for this entity`
    ).toBeVisible({ timeout: SECTION_LOAD_TIMEOUT });
  }
  await expectAllSectionsSettled(page);
  expect(
    await renderedSectionIds(page),
    "the rendered sections should match fixtures/expectedSections.ts exactly"
  ).toEqual(wanted);
}
