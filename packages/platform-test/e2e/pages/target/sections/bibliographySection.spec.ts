import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  BIBLIOGRAPHY_OPERATION,
  BIBLIOGRAPHY_PAGE_SIZES,
  BibliographySection,
} from "../../../../POM/objects/widgets/Bibliography/bibliographySection";
import { stubEuropePmc } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { requireTarget, TargetPage, targetIdentity, targetWidget } from "../../../../POM/page/target";
import { expectSectionLoaded, expectSections } from "../../../../utils/sections";

const OPERATION = BIBLIOGRAPHY_OPERATION.target;
const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST";

const TARGET_ID = /^ENSG\d{11}$/;
const DRUG_ID = /^CHEMBL\d+$/;
const DISEASE_ID = /^[A-Za-z]+_\d+$/;
/** "Score: 0.8653064855792125 ID: CHEMBL2103875" */
const SIMILAR_ENTITY_TITLE = /^Score: (0(\.\d+)?|1(\.0+)?) ID: (\S+)$/;

/** "2026-11": the month the date filter ends at when nothing is filtered, i.e. today. */
function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}`;
}

/**
 * Target profile > Bibliography (packages/sections/src/common/Literature, wired up by
 * packages/sections/src/target/Bibliography). One GraphQL operation,
 * TargetBibliographyQuery, returns the co-occurring entities and one page of publication
 * ids; the browser then asks Europe PMC for the details of those ids.
 *
 * Europe PMC is a third-party service, so every test here answers its search with a stub
 * and checks what the app asked it for. That keeps the tests about the app and its API.
 */
test.describe("Target bibliography section", () => {
  test("the section is loaded with its title, description, filters and the first five publications", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const bibliography = new BibliographySection(page);
    const searches = await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const { variables, publicationIds, count } = await firstResponse;
    await expectSectionLoaded(page, "bibliography");

    await test.step("title and description", async () => {
      await expect(bibliography.title).toHaveText("Bibliography");
      await expect(bibliography.description).toHaveText(
        `Scientific literature mentioning NLP-recognised entity ${symbol} and other selected co-occurring entities. Source: Open Targets.`
      );
      await expect(bibliography.description.locator("strong")).toHaveText(symbol);
      const source = bibliography.description.getByRole("link", { name: "Open Targets", exact: true });
      await expect(source).toHaveAttribute("href", "http://platform-docs.opentargets.org/bibliography");
    });

    await test.step("the first request asks for five publications of this target in every category", async () => {
      expect(variables).toMatchObject({
        id: ensgId,
        ids: [],
        index: 0,
        pageSize: 5,
        entityNames: ["disease", "drug", "target"],
        startYear: null,
        startMonth: null,
        endYear: null,
        endMonth: null,
      });
      expect(count, `${symbol} should have far more than one page of literature`).toBeGreaterThan(1000);
      expect(publicationIds).toHaveLength(5);
      for (const id of publicationIds) expect(id).toMatch(/^(\d+|PMC\d+|PPR\d+)$/);
    });

    await test.step("filters", async () => {
      await expect(bibliography.section.getByText("Tag category:", { exact: true })).toBeVisible();
      for (const category of ["Target", "Disease", "Drug"] as const) {
        await expect(bibliography.categoryCheckbox(category)).toBeChecked();
        await expect(bibliography.categoryCheckbox(category)).toBeEnabled();
      }
      await expect(bibliography.section.getByRole("checkbox")).toHaveCount(3);
      await expect(bibliography.section.getByText("Date Filter:", { exact: true })).toBeVisible();
      await expect(bibliography.dateSliderThumbs).toHaveCount(2);
      // the list has no free-text search of its own
      await expect(bibliography.section.getByTestId("table-search-input")).toHaveCount(0);
      await expect(bibliography.section.getByPlaceholder("Search")).toHaveCount(0);
    });

    await test.step("count and publications match the API", async () => {
      await bibliography.expectPublications(publicationIds);
      await bibliography.expectPosition(1, 5, count);
      expect(searches, "Europe PMC should be asked once, for exactly the publications listed").toEqual([
        publicationIds,
      ]);
    });
  });

  test("each publication shows its title, authors, journal and abstract from Europe PMC", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const { publicationIds } = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectPublications(publicationIds);
    await expect(bibliography.unavailablePublications).toHaveCount(0);

    for (const id of publicationIds) {
      const publication = bibliography.publication(id);
      const title = publication.getByRole("link", { name: `Stubbed publication ${id}`, exact: true });
      await expect(title).toHaveAttribute("href", `https://europepmc.org/abstract/med/${id}`);
      await expect(publication).toContainText("Tester A");
      await expect(publication).toContainText(/Journal of Stubs\s+2017\s*:1-2/);
      await expect(publication.getByRole("button", { name: "Show abstract" })).toBeEnabled();
    }

    await test.step("the abstract of one publication opens and closes without touching the others", async () => {
      const [first, second] = publicationIds;
      const publication = bibliography.publication(first);
      await publication.getByRole("button", { name: "Show abstract" }).click();
      await expect(publication).toContainText(`Abstract of ${first}`);
      await expect(publication.getByRole("button", { name: "Hide abstract" })).toBeVisible();
      await expect(bibliography.publication(second)).not.toContainText("Abstract of");
      await expect(bibliography.section.getByRole("button", { name: "Hide abstract" })).toHaveCount(1);

      await publication.getByRole("button", { name: "Hide abstract" }).click();
      await expect(publication).not.toContainText(`Abstract of ${first}`);
      await expect(publication.getByRole("button", { name: "Show abstract" })).toBeVisible();
    });
  });

  test("the target itself and its co-occurring entities are listed as chips, most similar first", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const { similarEntityIds } = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectSettled();

    await test.step("the target is the only selected entity and cannot be removed", async () => {
      await expect(bibliography.ownEntityChip(symbol)).toBeVisible();
      await expect(bibliography.selectedEntities.locator(`[title="ID: ${ensgId}"]`)).toHaveText(symbol);
      await expect(bibliography.addedEntityChips).toHaveCount(0);
      await expect(bibliography.selectedEntities.locator("svg")).toHaveCount(0);
    });

    await test.step("the co-occurring entities are the ones the API returned, without the target itself", async () => {
      expect(similarEntityIds, "the API should return fifteen similar entities").toHaveLength(15);
      const offered = similarEntityIds.filter((id) => id !== ensgId);
      await expect(bibliography.similarEntityChips).toHaveCount(offered.length);

      const titles = await bibliography.similarEntityChips.evaluateAll((chips) =>
        chips.map((chip) => chip.getAttribute("title") ?? "")
      );
      const scores: number[] = [];
      const ids: string[] = [];
      for (const title of titles) {
        const match = SIMILAR_ENTITY_TITLE.exec(title);
        if (!match) throw new Error(`"${title}" is not a similar-entity chip title`);
        scores.push(Number(match[1]));
        ids.push(match[4]);
      }
      expect(ids).toEqual(offered);
      expect(scores, "entities should be ordered by similarity score, highest first").toEqual(
        [...scores].sort((a, b) => b - a)
      );
      for (const score of scores) {
        expect(score, "only entities above the 0.5 similarity threshold are offered").toBeGreaterThanOrEqual(0.5);
        expect(score).toBeLessThanOrEqual(1);
      }
      for (const chip of await bibliography.similarEntityChips.all()) {
        await expect(chip).toHaveText(/\S/);
        await expect(chip).toBeEnabled();
      }
      const labels = await bibliography.similarEntityChips.allInnerTexts();
      expect(new Set(labels).size, "each entity should be offered once").toBe(labels.length);
    });
  });

  test("the tag categories decide which kinds of entity are offered", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    await new TargetPage(page).goto(ensgId);
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectSettled();
    const total = await bibliography.total();

    const offeredIds = async (): Promise<string[]> => {
      const ids: string[] = [];
      for (const chip of await bibliography.similarEntityChips.all()) {
        ids.push(await bibliography.chipEntityId(chip));
      }
      return ids;
    };

    /** Toggle one category and return the request it issued. */
    const toggle = async (category: "Target" | "Disease" | "Drug") => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.categoryCheckbox(category).click();
      const result = await response;
      await bibliography.expectSettled();
      return result;
    };

    await test.step("all three categories: drugs and targets are both among the entities", async () => {
      const ids = await offeredIds();
      expect(ids.some((id) => DRUG_ID.test(id)), "a kinase target should co-occur with drugs").toBe(true);
      expect(ids.some((id) => TARGET_ID.test(id)), "a kinase target should co-occur with targets").toBe(true);
    });

    await test.step("without Target and Disease, only drugs are offered", async () => {
      const withoutTarget = await toggle("Target");
      expect(withoutTarget.variables.entityNames).toEqual(["disease", "drug"]);
      await expect(bibliography.categoryCheckbox("Target")).not.toBeChecked();
      for (const id of await offeredIds()) expect(id).not.toMatch(TARGET_ID);

      const drugsOnly = await toggle("Disease");
      expect(drugsOnly.variables.entityNames).toEqual(["drug"]);
      const ids = await offeredIds();
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) expect(id, "only drugs should be offered").toMatch(DRUG_ID);
    });

    await test.step("with Disease only, only diseases are offered", async () => {
      await toggle("Disease");
      const diseasesOnly = await toggle("Drug");
      expect(diseasesOnly.variables.entityNames).toEqual(["disease"]);
      await expect(bibliography.categoryCheckbox("Disease")).toBeChecked();
      await expect(bibliography.categoryCheckbox("Drug")).not.toBeChecked();
      const ids = await offeredIds();
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(id, "only diseases should be offered").toMatch(DISEASE_ID);
        expect(id).not.toMatch(TARGET_ID);
        expect(id).not.toMatch(DRUG_ID);
      }
    });

    await test.step("the categories filter the entities offered, not the publications", async () => {
      expect(await bibliography.total()).toBe(total);
    });

    await test.step("all categories again: the original mix is back", async () => {
      await toggle("Drug");
      const all = await toggle("Target");
      expect(all.variables.entityNames).toEqual(["disease", "drug", "target"]);
      const ids = await offeredIds();
      expect(ids.some((id) => DRUG_ID.test(id))).toBe(true);
      expect(ids.some((id) => TARGET_ID.test(id))).toBe(true);
    });
  });

  test("adding a co-occurring entity narrows the publications, and removing it restores them", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const { symbol } = targetIdentity(ensgId);
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const initial = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectPublications(initial.publicationIds);
    const total = initial.count;

    const firstChip = bibliography.similarEntityChips.first();
    const firstLabel = (await firstChip.innerText()).trim();
    const firstId = await bibliography.chipEntityId(firstChip);
    let withOne = 0;

    await test.step("the first entity is added to the search", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await firstChip.click();
      const added = await response;
      expect(added.variables.ids, "the request should ask for publications that also mention the entity").toEqual([
        firstId,
      ]);
      expect(added.variables.index).toBe(0);

      await expect(bibliography.addedEntityChips).toHaveText([firstLabel]);
      await expect(bibliography.addedEntityChips.first()).toHaveAttribute(
        "title",
        new RegExp(`^Score: \\S+ ID: ${firstId}$`)
      );
      await expect(bibliography.ownEntityChip(symbol)).toBeVisible();
      await expect(
        bibliography.similarEntities.locator(`[title$="ID: ${firstId}"]`),
        "an entity that is selected should no longer be offered"
      ).toHaveCount(0);

      await bibliography.expectPublications(added.publicationIds);
      withOne = added.count;
      expect(withOne, "publications mentioning both should exist").toBeGreaterThan(0);
      expect(withOne, "publications mentioning both should be fewer than those mentioning the target").toBeLessThan(
        total
      );
      await bibliography.expectPosition(1, Math.min(5, withOne), withOne);
      expect(added.publicationIds, "the list should change with the search").not.toEqual(initial.publicationIds);
    });

    await test.step("a second entity narrows the search further", async () => {
      const secondChip = bibliography.similarEntityChips.first();
      const secondLabel = (await secondChip.innerText()).trim();
      const secondId = await bibliography.chipEntityId(secondChip);
      expect(secondId).not.toBe(firstId);

      const response = bibliography.nextResponse(OPERATION, "target");
      await secondChip.click();
      const added = await response;
      expect(added.variables.ids).toEqual([firstId, secondId]);
      await expect(bibliography.addedEntityChips).toHaveText([firstLabel, secondLabel]);
      await bibliography.expectSettled();
      expect(added.count, "a third entity cannot widen the search").toBeLessThanOrEqual(withOne);
      await expect(bibliography.countInfo).toHaveText(
        `Showing ${Math.min(5, added.count)} of ${added.count} results`
      );
    });

    await test.step("clicking a selected entity removes it", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.addedEntityChips.nth(1).click();
      const removed = await response;
      expect(removed.variables.ids).toEqual([firstId]);
      await expect(bibliography.addedEntityChips).toHaveText([firstLabel]);
      await bibliography.expectSettled();
      expect(removed.count).toBe(withOne);
    });

    await test.step("its delete icon removes it too, and the original publications return", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.addedEntityChips.first().locator("svg").click();
      const removed = await response;
      expect(removed.variables.ids).toEqual([]);
      await expect(bibliography.addedEntityChips).toHaveCount(0);
      expect(removed.count).toBe(total);
      await bibliography.expectPublications(initial.publicationIds);
      await bibliography.expectPosition(1, 5, total);
      await expect(
        bibliography.similarEntities.locator(`[title$="ID: ${firstId}"]`),
        "a removed entity should be offered again"
      ).toHaveText(firstLabel);
    });
  });

  test("the list is paged by the server, five publications at a time", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const bibliography = new BibliographySection(page);
    const searches = await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const firstPage = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectPublications(firstPage.publicationIds);
    const total = firstPage.count;

    await test.step("first page", async () => {
      await bibliography.expectPosition(1, 5, total);
      await expect(bibliography.previousPageButton).toBeDisabled();
      await expect(bibliography.nextPageButton).toBeEnabled();
      await expect(bibliography.pageSizeSelect).toHaveValue("5");
      await expect(bibliography.pageSizeSelect.locator("option")).toHaveText([...BIBLIOGRAPHY_PAGE_SIZES]);
    });

    await test.step("next asks the API for the second page and shows other publications", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.nextPageButton.click();
      const secondPage = await response;
      expect(secondPage.variables).toMatchObject({ index: 1, pageSize: 5, id: ensgId });
      expect(secondPage.publicationIds).toHaveLength(5);
      for (const id of secondPage.publicationIds) {
        expect(firstPage.publicationIds, "page 2 should not repeat page 1").not.toContain(id);
      }
      await bibliography.expectPublications(secondPage.publicationIds);
      await bibliography.expectPosition(6, 10, total);
      await expect(bibliography.previousPageButton).toBeEnabled();
      await expect(bibliography.nextPageButton).toBeEnabled();
      expect(
        searches[searches.length - 1],
        "Europe PMC should be asked only for the publications of the new page"
      ).toEqual(secondPage.publicationIds);
    });

    await test.step("previous returns to the first page", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.previousPageButton.click();
      const back = await response;
      expect(back.variables.index).toBe(0);
      await bibliography.expectPublications(firstPage.publicationIds);
      await bibliography.expectPosition(1, 5, total);
      await expect(bibliography.previousPageButton).toBeDisabled();
    });
  });

  test("the page size changes how many publications are listed and returns to the first page", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const firstPage = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectPublications(firstPage.publicationIds);
    const total = firstPage.count;

    await bibliography.nextPageButton.click();
    await bibliography.expectPosition(6, 10, total);

    await test.step("ten per page", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.setPageSize("10");
      const ten = await response;
      expect(ten.variables).toMatchObject({ index: 0, pageSize: 10 });
      expect(ten.publicationIds).toHaveLength(10);
      expect(ten.publicationIds.slice(0, 5), "the first five should be the original first page").toEqual(
        firstPage.publicationIds
      );
      await bibliography.expectPublications(ten.publicationIds);
      await bibliography.expectPosition(1, 10, total);
      await expect(bibliography.previousPageButton).toBeDisabled();
    });

    await test.step("twenty-five per page, and the next page continues from there", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.setPageSize("25");
      const twentyFive = await response;
      expect(twentyFive.variables).toMatchObject({ index: 0, pageSize: 25 });
      await bibliography.expectPublications(twentyFive.publicationIds);
      await expect(bibliography.publications).toHaveCount(25);
      await bibliography.expectPosition(1, 25, total);

      const nextResponse = bibliography.nextResponse(OPERATION, "target");
      await bibliography.nextPageButton.click();
      const next = await nextResponse;
      expect(next.variables).toMatchObject({ index: 1, pageSize: 25 });
      await bibliography.expectPublications(next.publicationIds);
      await bibliography.expectPosition(26, 50, total);
    });
  });

  test("a target with two pages of literature ends on the second page", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withFewPublications");
    const { symbol } = targetIdentity(ensgId);
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const firstPage = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectPublications(firstPage.publicationIds);
    const total = firstPage.count;
    expect(total, `${symbol} should have more than one and at most two pages of five`).toBeGreaterThan(5);
    expect(total).toBeLessThanOrEqual(10);

    await expect(bibliography.ownEntityChip(symbol)).toBeVisible();
    await bibliography.expectPosition(1, 5, total);

    await test.step("the second page is the last", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.nextPageButton.click();
      const lastPage = await response;
      expect(lastPage.publicationIds).toHaveLength(total - 5);
      await bibliography.expectPublications(lastPage.publicationIds);
      await expect(bibliography.pagePosition).toHaveText(`6–${total} of ${total}`);
      await expect(bibliography.nextPageButton).toBeDisabled();
      await expect(bibliography.previousPageButton).toBeEnabled();
    });

    await test.step("a page size larger than the total shows everything on one page", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await bibliography.setPageSize("25");
      const all = await response;
      expect(all.publicationIds).toHaveLength(total);
      expect(new Set(all.publicationIds).size, "each publication should be listed once").toBe(total);
      await bibliography.expectPublications(all.publicationIds);
      await expect(bibliography.pagePosition).toHaveText(`1–${total} of ${total}`);
      await expect(bibliography.countInfo).toHaveText(`Showing ${total} of ${total} results`);
      await expect(bibliography.nextPageButton).toBeDisabled();
      await expect(bibliography.previousPageButton).toBeDisabled();
    });
  });

  test("the date filter spans from the earliest publication year to this month", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    await new TargetPage(page).goto(ensgId);
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectSettled();

    await expect(
      bibliography.dateRangeStart,
      "the range should start in January of the earliest publication year, not at the YYYY-MM placeholder"
    ).toHaveText(/^(19|20)\d{2}-1$/);
    await expect(bibliography.dateRangeEnd).toHaveText(currentYearMonth());
    await expect(bibliography.dateSliderThumbs.first()).toHaveAttribute("aria-valuenow", "0");
    await expect(
      bibliography.dateSliderThumbs.first(),
      "the slider should have months to choose from"
    ).not.toHaveAttribute("aria-valuemax", "0");
  });

  test("narrowing the date range filters the publications by publication date", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withFewPublications");
    const bibliography = new BibliographySection(page);
    await stubEuropePmc(page);

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const unfiltered = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectPublications(unfiltered.publicationIds);
    const total = unfiltered.count;

    const [startThumb, endThumb] = [bibliography.dateSliderThumbs.nth(0), bibliography.dateSliderThumbs.nth(1)];
    let earliestYear = 0;
    let months = 0;

    await test.step("unfiltered, the range runs from January of the earliest year to this month", async () => {
      await expect(bibliography.dateRangeStart).toHaveText(/^(19|20)\d{2}-1$/);
      earliestYear = Number((await bibliography.dateRangeStart.innerText()).split("-")[0]);
      await expect(bibliography.dateRangeEnd).toHaveText(currentYearMonth());
      const now = new Date();
      months = (now.getFullYear() - earliestYear) * 12 + now.getMonth();
      expect(months, "the test target should have more than two years of literature").toBeGreaterThan(24);
      await expect(startThumb).toHaveAttribute("aria-valuenow", "0");
      await expect(endThumb).toHaveAttribute("aria-valuenow", String(months));
      await expect(endThumb).toHaveAttribute("aria-valuemax", String(months));
    });

    await test.step("moving the start past the earliest year drops the earliest publications", async () => {
      // one PageUp moves a thumb by ten months and commits once
      const first = bibliography.nextResponse(OPERATION, "target");
      await startThumb.focus();
      await page.keyboard.press("PageUp");
      await first;
      await bibliography.expectSettled();
      const response = bibliography.nextResponse(OPERATION, "target");
      await page.keyboard.press("PageUp");
      const filtered = await response;

      // twenty months after January of the earliest year is September of the next
      expect(filtered.variables).toMatchObject({
        id: ensgId,
        index: 0,
        startYear: earliestYear + 1,
        startMonth: 9,
        endYear: new Date().getFullYear(),
        endMonth: new Date().getMonth() + 1,
      });
      await expect(bibliography.dateRangeStart).toHaveText(`${earliestYear + 1}-9`);
      await expect(bibliography.dateRangeEnd).toHaveText(currentYearMonth());
      await expect(startThumb).toHaveAttribute("aria-valuenow", "20");

      expect(filtered.count, "some publications should fall inside the narrower range").toBeGreaterThan(0);
      expect(
        filtered.count,
        "the publications of the earliest year fall outside the range and should be dropped"
      ).toBeLessThan(total);
      await bibliography.expectPublications(filtered.publicationIds);
      await bibliography.expectPosition(1, Math.min(5, filtered.count), filtered.count);
    });

    await test.step("moving the end back by a month is sent with the start kept", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await endThumb.focus();
      await page.keyboard.press("ArrowLeft");
      const filtered = await response;
      const lastMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      expect(filtered.variables).toMatchObject({
        startYear: earliestYear + 1,
        startMonth: 9,
        endYear: lastMonth.getFullYear(),
        endMonth: lastMonth.getMonth() + 1,
      });
      await bibliography.expectSettled();
      await expect(bibliography.dateRangeEnd).toHaveText(
        `${lastMonth.getFullYear()}-${lastMonth.getMonth() + 1}`
      );
      await expect(bibliography.dateRangeStart).toHaveText(`${earliestYear + 1}-9`);
      await expect(endThumb).toHaveAttribute("aria-valuenow", String(months - 1));
    });

    await test.step("widening the range again brings every publication back", async () => {
      const response = bibliography.nextResponse(OPERATION, "target");
      await startThumb.focus();
      await page.keyboard.press("Home");
      const widened = await response;
      expect(widened.variables).toMatchObject({ startYear: earliestYear, startMonth: 1 });
      await bibliography.expectSettled();
      await expect(bibliography.dateRangeStart).toHaveText(`${earliestYear}-1`);

      const lastResponse = bibliography.nextResponse(OPERATION, "target");
      await endThumb.focus();
      await page.keyboard.press("End");
      const all = await lastResponse;
      expect(all.count).toBe(total);
      await bibliography.expectPublications(unfiltered.publicationIds);
      await bibliography.expectPosition(1, 5, total);
    });
  });

  test("a publication Europe PMC cannot return is listed as unavailable, with its id", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const bibliography = new BibliographySection(page);
    // Europe PMC answers, but knows none of the publications asked for
    await page.route(EUROPE_PMC_SEARCH, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ hitCount: 0, resultList: { result: [] } }),
      })
    );

    const firstResponse = bibliography.nextResponse(OPERATION, "target");
    await new TargetPage(page).goto(ensgId);
    const { publicationIds, count } = await firstResponse;
    await expectSectionLoaded(page, "bibliography");
    await bibliography.expectSettled();

    await expect(bibliography.unavailablePublications).toHaveCount(publicationIds.length);
    for (const id of publicationIds) {
      await expect(bibliography.section.getByText(`Publication ID: ${id}`, { exact: true })).toBeVisible();
    }
    await expect(bibliography.publications).toHaveCount(0);
    // the rest of the section does not depend on Europe PMC
    await bibliography.expectPosition(1, 5, count);
    await expect(bibliography.similarEntityChips.first()).toBeEnabled();
  });

  test("a target without literature does not render the section", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withoutLiteratureOrQtl");
    const sectionsWithData = expectedSectionsFor(ensgId);
    const bibliography = new BibliographySection(page);
    const target = new TargetPage(page);

    expect(sectionsWithData, "the manifest should record this target as having no literature").not.toContain(
      "bibliography"
    );
    await target.goto(ensgId);
    await expectSections(page, sectionsWithData);

    await expect(bibliography.section).toHaveCount(0);
    await expect(target.summaryChip(targetWidget("bibliography"))).toHaveCSS("cursor", "auto");
  });
});
