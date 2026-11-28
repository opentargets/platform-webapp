import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { DiseaseBibliographySection } from "../../../../POM/objects/widgets/Disease/diseaseBibliographySection";
import { expectExternalLink } from "../../../../POM/objects/widgets/Drug/sectionTable";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { DiseasePage } from "../../../../POM/page/disease/disease";
import { expectSectionLoaded } from "../../../../utils/sections";

const DEFAULT_PAGE_SIZE = 5;
const MAX_SIMILAR_ENTITIES = 15;
const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST";
/** Marfan syndrome: a rarer disease, with far fewer publications. */
const RARER = { id: "MONDO_0007947", name: "Marfan syndrome" };
/** An OTAR therapeutic area: only the ontology and the bibliography sections. */
const THERAPEUTIC_AREA = "OTAR_0000018";

type BibliographyData = {
  disease: {
    literatureOcurrences: {
      count: number;
      stats: { earliestPubDate: number };
      rows: { pmid: string | null; pmcid: string | null }[];
    };
  };
};

async function openBibliography(
  page: Page,
  diseaseId: string
): Promise<DiseaseBibliographySection> {
  const bibliography = new DiseaseBibliographySection(page);
  await new DiseasePage(page).goto(diseaseId);
  await expectSectionLoaded(page, DiseaseBibliographySection.id);
  return bibliography;
}

test.describe("Disease page: Bibliography", () => {
  // The section asks Europe PMC for publication details. That third-party service
  // throttles and then answers without CORS headers, so it is stubbed: these tests depend
  // only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description, filters and five publications", async ({ page, testConfig }) => {
    const { primary } = testConfig.disease;
    const name = testConfig.disease.name ?? "";
    const bibliography = await openBibliography(page, primary);

    await test.step("title and description", async () => {
      await expect(new DiseasePage(page).sectionTitle(DiseaseBibliographySection.id)).toHaveText(
        "Bibliography"
      );
      await expect(bibliography.description).toHaveText(
        `Scientific literature mentioning NLP-recognised entity ${name} and other selected co-occurring entities. Source: Open Targets.`
      );
      await expectExternalLink(
        bibliography.description.getByRole("link", { name: "Open Targets" }),
        "http://platform-docs.opentargets.org/bibliography"
      );
    });

    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
    expect(
      total,
      "myocardial infarction is mentioned in thousands of publications"
    ).toBeGreaterThan(1000);

    await test.step("all three tag categories are on", async () => {
      await expect(bibliography.section).toContainText("Tag category:");
      for (const label of ["Target", "Disease", "Drug"] as const) {
        await expect(bibliography.categoryCheckbox(label)).toBeChecked();
        await expect(bibliography.categoryCheckbox(label)).toBeEnabled();
      }
    });

    await test.step("the disease is the only selected entity", async () => {
      await expect(bibliography.diseaseChip).toHaveText(name);
      await expect(bibliography.diseaseChip).toHaveAttribute("title", `ID: ${primary}`);
      await expect(bibliography.addedEntityChips).toHaveCount(0);
    });

    await test.step("co-occurring entities are offered, with score and id, the disease itself excluded", async () => {
      await expect(bibliography.similarEntityChips.first()).toBeVisible();
      const chips = await bibliography.similarEntityChips.all();
      expect(chips.length).toBeLessThanOrEqual(MAX_SIMILAR_ENTITIES);
      expect(chips.length).toBeGreaterThan(5);
      const ids: string[] = [];
      for (const chip of chips) {
        await expect(chip).not.toBeEmpty();
        await expect(chip).toHaveAttribute(
          "title",
          /^Score: 0\.\d+ ID: (ENSG\d{11}|CHEMBL\d+|[A-Za-z]+_\d+)$/
        );
        ids.push(((await chip.getAttribute("title")) ?? "").replace(/^.* ID: /, ""));
      }
      expect(ids).not.toContain(primary);
      expect(new Set(ids).size, "no entity is offered twice").toBe(ids.length);
    });

    await test.step("each publication links to Europe PMC and shows authors and journal", async () => {
      const ids = await bibliography.publicationIds();
      expect(new Set(ids).size).toBe(DEFAULT_PAGE_SIZE);
      for (const id of ids) {
        expect(id).toMatch(/^(\d+|PMC\d+)$/);
        const entry = bibliography.publication(id);
        const title = entry.getByRole("link").first();
        await expectExternalLink(title, `https://europepmc.org/abstract/med/${id}`);
        await expect(title).toHaveText(`Stubbed publication ${id}`);
        await expect(entry.getByRole("button", { name: "Show abstract" })).toBeEnabled();
        await expect(entry, "authors, journal and year").toContainText("Tester A");
        await expect(entry).toContainText("Journal of Stubs");
        await expect(entry).toContainText("2017");
      }
    });

    await test.step("pagination footer", async () => {
      await expect(bibliography.position).toHaveText(`1–${DEFAULT_PAGE_SIZE} of ${total}`);
      await expect(bibliography.previousPageButton).toBeDisabled();
      await expect(bibliography.nextPageButton).toBeEnabled();
      await expect(bibliography.pageSizeSelect).toHaveValue(String(DEFAULT_PAGE_SIZE));
      await expect(bibliography.pageSizeSelect.getByRole("option")).toHaveText(["5", "10", "25"]);
    });
  });

  test("pagination moves through the publications and page size widens the page", async ({
    page,
    testConfig,
  }) => {
    const bibliography = await openBibliography(page, testConfig.disease.primary);
    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
    const firstPage = await bibliography.publicationIds();

    await test.step("next page", async () => {
      await bibliography.nextPageButton.click();
      await expect(bibliography.position).toHaveText(`6–10 of ${total}`);
      await bibliography.expectResults(DEFAULT_PAGE_SIZE);
      const secondPage = await bibliography.publicationIds();
      for (const id of secondPage) expect(firstPage).not.toContain(id);
      await expect(bibliography.previousPageButton).toBeEnabled();
    });

    await test.step("previous page", async () => {
      await bibliography.previousPageButton.click();
      await expect(bibliography.position).toHaveText(`1–5 of ${total}`);
      await bibliography.expectResults(DEFAULT_PAGE_SIZE);
      expect(await bibliography.publicationIds()).toEqual(firstPage);
      await expect(bibliography.previousPageButton).toBeDisabled();
    });

    await test.step("ten per page", async () => {
      await bibliography.pageSizeSelect.selectOption("10");
      await expect(bibliography.position).toHaveText(`1–10 of ${total}`);
      expect(await bibliography.expectResults(10)).toBe(total);
      const ids = await bibliography.publicationIds();
      expect(ids.slice(0, DEFAULT_PAGE_SIZE)).toEqual(firstPage);
      expect(new Set(ids).size).toBe(10);
    });

    await test.step("twenty-five per page, then the next page", async () => {
      await bibliography.pageSizeSelect.selectOption("25");
      await expect(bibliography.position).toHaveText(`1–25 of ${total}`);
      await bibliography.expectResults(25);
      await bibliography.nextPageButton.click();
      await expect(bibliography.position).toHaveText(`26–50 of ${total}`);
      await bibliography.expectResults(25);
    });
  });

  test("adding a co-occurring entity narrows the publications, removing it restores them", async ({
    page,
    testConfig,
  }) => {
    const { primary } = testConfig.disease;
    const name = testConfig.disease.name ?? "";
    const bibliography = await openBibliography(page, primary);
    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
    const firstPage = await bibliography.publicationIds();

    const chip = bibliography.similarEntityChips.first();
    const label = (await chip.innerText()).trim();
    const title = (await chip.getAttribute("title")) ?? "";
    const entityId = title.replace(/^.* ID: /, "");
    expect(label).not.toBe("");

    const request = page.waitForRequest((candidate) => {
      const body = candidate.postDataJSON?.() as {
        operationName?: string;
        variables?: { ids?: string[] };
      } | null;
      return (
        body?.operationName === "DiseaseBibliographyQuery" && body.variables?.ids?.[0] === entityId
      );
    });
    await chip.click();
    await request;

    await test.step("the entity moves to the selected row", async () => {
      await expect(bibliography.addedEntityChips).toHaveText([label]);
      await expect(bibliography.addedEntityChips).toHaveAttribute("title", title);
      await expect(bibliography.diseaseChip).toHaveText(name);
      await expect(
        bibliography.similarEntityChips.filter({ hasText: new RegExp(`^${label}$`) }),
        "a selected entity is no longer offered"
      ).toHaveCount(0);
    });

    await test.step("fewer publications mention both", async () => {
      await expect(bibliography.countInfo).not.toHaveText(new RegExp(` of ${total} results$`));
      const narrowed = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
      expect(narrowed).toBeGreaterThan(0);
      expect(narrowed).toBeLessThan(total);
      await expect(bibliography.position).toHaveText(`1–${DEFAULT_PAGE_SIZE} of ${narrowed}`);
    });

    await test.step("removing the entity restores the original result", async () => {
      await bibliography.addedEntityChips.first().click();
      await expect(bibliography.addedEntityChips).toHaveCount(0);
      await expect(bibliography.countInfo).toHaveText(
        `Showing ${DEFAULT_PAGE_SIZE} of ${total} results`
      );
      await bibliography.expectResults(DEFAULT_PAGE_SIZE);
      expect(await bibliography.publicationIds()).toEqual(firstPage);
      await expect(
        bibliography.similarEntityChips.filter({ hasText: new RegExp(`^${label}$`) })
      ).toHaveCount(1);
    });
  });

  test("tag categories restrict which co-occurring entities are offered", async ({
    page,
    testConfig,
  }) => {
    const bibliography = await openBibliography(page, testConfig.disease.primary);
    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);

    const idsOffered = async (): Promise<string[]> => {
      await expect(bibliography.similarEntityChips.first()).toBeVisible();
      const titles = await bibliography.similarEntityChips.evaluateAll((chips) =>
        chips.map((chip) => chip.getAttribute("title") ?? "")
      );
      return titles.map((title) => title.replace(/^.* ID: /, ""));
    };
    const initial = await idsOffered();
    expect(
      initial.some((id) => id.startsWith("CHEMBL")),
      "a drug is offered"
    ).toBe(true);
    expect(
      initial.some((id) => /^[A-Za-z]+_\d+$/.test(id)),
      "diseases are offered"
    ).toBe(true);

    /** The entity names the next bibliography request restricts the entities to. */
    const nextEntityNames = (): Promise<string[]> =>
      page
        .waitForRequest((candidate) => {
          const body = candidate.postDataJSON?.() as {
            operationName?: string;
            variables?: { entityNames?: string[] | null };
          } | null;
          return (
            body?.operationName === "DiseaseBibliographyQuery" &&
            Array.isArray(body.variables?.entityNames)
          );
        })
        .then(
          (request) =>
            (request.postDataJSON() as { variables: { entityNames: string[] } }).variables
              .entityNames
        );

    await test.step("without Drug, no drug is offered", async () => {
      const names = nextEntityNames();
      await bibliography.setCategory("Drug", false);
      const sent = (await names).map((name) => name.toLowerCase()).sort();
      expect(sent, "the API is asked for targets and diseases only").toEqual(["disease", "target"]);
      await expect
        .poll(async () => (await idsOffered()).filter((id) => id.startsWith("CHEMBL")), {
          message: "drug chips should disappear",
        })
        .toEqual([]);
      expect((await idsOffered()).length).toBeGreaterThan(0);
    });

    await test.step("with only Disease, only diseases are offered", async () => {
      const names = nextEntityNames();
      await bibliography.setCategory("Target", false);
      expect((await names).map((name) => name.toLowerCase())).toEqual(["disease"]);
      await expect
        .poll(async () => (await idsOffered()).filter((id) => /^(ENSG|CHEMBL)/.test(id)), {
          message: "only disease chips should remain",
        })
        .toEqual([]);
      for (const id of await idsOffered()) expect(id).toMatch(/^[A-Za-z]+_\d+$/);
    });

    await test.step("the publications themselves are not filtered by category", async () => {
      expect(await bibliography.expectResults(DEFAULT_PAGE_SIZE)).toBe(total);
    });

    await test.step("switching the categories back on offers drugs again", async () => {
      await bibliography.setCategory("Target", true);
      await bibliography.setCategory("Drug", true);
      await expect(bibliography.categoryCheckbox("Disease")).toBeChecked();
      await expect
        .poll(async () => (await idsOffered()).some((id) => id.startsWith("CHEMBL")))
        .toBe(true);
    });
  });

  test("a publication's abstract can be shown and hidden", async ({ page, testConfig }) => {
    const bibliography = await openBibliography(page, testConfig.disease.primary);
    await bibliography.expectResults(DEFAULT_PAGE_SIZE);

    const [id] = await bibliography.publicationIds();
    const entry = bibliography.publication(id);
    await expect(entry.getByText("Abstract", { exact: true })).toHaveCount(0);
    await expect(entry).not.toContainText(`Abstract of ${id}`);

    await entry.getByRole("button", { name: "Show abstract" }).click();
    await expect(entry.getByRole("button", { name: "Hide abstract" })).toBeVisible();
    await expect(entry, "the abstract of this publication is rendered under it").toContainText(
      `Abstract of ${id}`
    );
    await expect(
      bibliography.section.getByText("Abstract", { exact: true }),
      "only the publication clicked is expanded"
    ).toHaveCount(1);

    await entry.getByRole("button", { name: "Hide abstract" }).click();
    await expect(entry.getByRole("button", { name: "Show abstract" })).toBeVisible();
    await expect(entry).not.toContainText(`Abstract of ${id}`);
  });

  test("asks Europe PMC for exactly the publications the API listed, once each", async ({
    page,
    testConfig,
  }) => {
    const { primary } = testConfig.disease;
    // Registered after the hook's stub, so this one answers and records the searches.
    const searches = await stubEuropePmc(page);
    const bibliography = new DiseaseBibliographySection(page);
    const firstResponse = waitForOperation<BibliographyData>(page, "DiseaseBibliographyQuery");
    await new DiseasePage(page).goto(primary);
    const { data, variables } = await firstResponse;
    await expectSectionLoaded(page, DiseaseBibliographySection.id);
    await bibliography.expectResults(DEFAULT_PAGE_SIZE);

    expect(variables).toMatchObject({ id: primary, ids: [], index: 0, pageSize: 5, size: 15 });
    const apiIds = data.disease.literatureOcurrences.rows.map((row) => row.pmid || row.pmcid);
    expect(apiIds).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(await bibliography.publicationIds(), "the list follows the API's order").toEqual(apiIds);
    expect(searches, "one Europe PMC search for the first page").toEqual([apiIds]);
    await expect(bibliography.countInfo).toHaveText(
      `Showing ${DEFAULT_PAGE_SIZE} of ${data.disease.literatureOcurrences.count} results`
    );

    await test.step("the next page asks only for its own publications", async () => {
      const nextResponse = waitForOperation<BibliographyData>(page, "DiseaseBibliographyQuery");
      await bibliography.nextPageButton.click();
      const next = await nextResponse;
      expect(next.variables).toMatchObject({ id: primary, index: 1, pageSize: 5 });
      const nextIds = next.data.disease.literatureOcurrences.rows.map(
        (row) => row.pmid || row.pmcid
      );
      await bibliography.expectResults(DEFAULT_PAGE_SIZE);
      expect(await bibliography.publicationIds()).toEqual(nextIds);
      expect(searches).toEqual([apiIds, nextIds]);
    });

    await test.step("going back uses the details already downloaded", async () => {
      await bibliography.previousPageButton.click();
      await expect(bibliography.position).toHaveText(/^1–5 of \d+$/);
      await bibliography.expectResults(DEFAULT_PAGE_SIZE);
      expect(await bibliography.publicationIds()).toEqual(apiIds);
      expect(searches, "no third search").toHaveLength(2);
    });
  });

  test("says so for each publication when Europe PMC cannot be reached", async ({
    page,
    testConfig,
  }) => {
    await page.route(EUROPE_PMC_SEARCH, (route) => route.abort("connectionfailed"));
    const bibliography = new DiseaseBibliographySection(page);
    const firstResponse = waitForOperation<BibliographyData>(page, "DiseaseBibliographyQuery");
    await new DiseasePage(page).goto(testConfig.disease.primary);
    const { data } = await firstResponse;
    await expectSectionLoaded(page, DiseaseBibliographySection.id);

    const unavailable = bibliography.section.getByText("Could not download publication details");
    await expect(unavailable).toHaveCount(DEFAULT_PAGE_SIZE);
    await expect(bibliography.publications).toHaveCount(0);
    for (const row of data.disease.literatureOcurrences.rows) {
      await expect(bibliography.section).toContainText(`Publication ID: ${row.pmid || row.pmcid}`);
    }
    // The section's own data is unaffected: count, filters and pagination still work.
    await expect(bibliography.countInfo).toHaveText(
      `Showing ${DEFAULT_PAGE_SIZE} of ${data.disease.literatureOcurrences.count} results`
    );
    await expect(bibliography.nextPageButton).toBeEnabled();
    await expect(bibliography.similarEntityChips.first()).toBeVisible();
  });

  test("the date filter spans from the earliest publication to today and narrows the publications", async ({
    page,
    testConfig,
  }) => {
    const { primary } = testConfig.disease;
    const firstResponse = waitForOperation<BibliographyData>(page, "DiseaseBibliographyQuery");
    const bibliography = await openBibliography(page, primary);
    const { data } = await firstResponse;
    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
    const earliest = data.disease.literatureOcurrences.stats.earliestPubDate;
    expect(
      earliest,
      "the API reports the year of the earliest publication (0 leaves the date filter unusable)"
    ).toBeGreaterThan(1900);
    const earliestYear = earliest;

    await expect(bibliography.section).toContainText("Date Filter:");
    await expect(bibliography.dateSliderThumbs).toHaveCount(2);
    await expect(
      bibliography.dateRangeStart,
      "the range starts at the earliest publication (year-month)"
    ).toHaveText(new RegExp(`^${earliestYear}-\\d{1,2}$`));
    await expect(bibliography.dateRangeEnd, "the range ends at the current month").toHaveText(
      new RegExp(`^${new Date().getFullYear()}-\\d{1,2}$`)
    );

    await test.step("moving the start of the range sends it to the API and narrows the result", async () => {
      const request = page.waitForRequest((candidate) => {
        const body = candidate.postDataJSON?.() as {
          operationName?: string;
          variables?: { startYear?: number | null };
        } | null;
        // the slider sends a request on every move; wait for the one that has left the
        // earliest year, not the first intermediate one
        return (
          body?.operationName === "DiseaseBibliographyQuery" &&
          typeof body.variables?.startYear === "number" &&
          body.variables.startYear > earliestYear
        );
      });
      await bibliography.startThumb.focus();
      // PageUp moves a thumb by ten months; sixty presses move it by fifty years.
      for (let press = 0; press < 60; press++) await bibliography.startThumb.press("PageUp");
      const sent = (await request).postDataJSON() as {
        variables: { startYear: number; startMonth: number; endYear: number };
      };
      expect(sent.variables.startYear).toBeGreaterThan(earliestYear);
      expect(sent.variables.startMonth).toBeGreaterThanOrEqual(1);
      await expect(bibliography.dateRangeStart).not.toHaveText(new RegExp(`^${earliestYear}-`));
      await expect(bibliography.countInfo).not.toHaveText(new RegExp(` of ${total} results$`));
      const narrowed = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
      expect(narrowed).toBeLessThan(total);
      expect(narrowed).toBeGreaterThan(0);
    });
  });

  test("a rarer disease shows a smaller, consistent count", async ({ page }) => {
    const bibliography = await openBibliography(page, RARER.id);
    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
    expect(total).toBeGreaterThan(DEFAULT_PAGE_SIZE);
    expect(total).toBeLessThan(100_000);
    await expect(bibliography.position).toHaveText(`1–${DEFAULT_PAGE_SIZE} of ${total}`);
    await expect(bibliography.diseaseChip).toHaveText(RARER.name);
    await expect(bibliography.diseaseChip).toHaveAttribute("title", `ID: ${RARER.id}`);
  });

  test("a therapeutic area with a single publication", async ({ page }) => {
    const bibliography = await openBibliography(page, THERAPEUTIC_AREA);
    const total = await bibliography.expectResults(1);
    expect(total).toBe(1);
    await expect(bibliography.countInfo).toHaveText("Showing 1 of 1 results");
    await expect(bibliography.position).toHaveText("1–1 of 1");
    await expect(bibliography.previousPageButton).toBeDisabled();
    await expect(bibliography.nextPageButton).toBeDisabled();
    await expect(bibliography.diseaseChip).toHaveAttribute("title", `ID: ${THERAPEUTIC_AREA}`);
  });

  test("a date range that excludes every publication empties the list", async ({ page }) => {
    // This area's one publication is from 2022, and its earliest year is known, so the
    // slider works here.
    const bibliography = await openBibliography(page, THERAPEUTIC_AREA);
    await bibliography.expectResults(1);
    await expect(bibliography.dateRangeStart).toHaveText(/^2022-\d{1,2}$/);
    await expect(bibliography.dateRangeEnd).toHaveText(
      new RegExp(`^${new Date().getFullYear()}-\\d{1,2}$`)
    );

    const request = page.waitForRequest((candidate) => {
      const body = candidate.postDataJSON?.() as {
        operationName?: string;
        variables?: { startYear?: number | null };
      } | null;
      return (
        body?.operationName === "DiseaseBibliographyQuery" &&
        typeof body.variables?.startYear === "number"
      );
    });
    await bibliography.startThumb.focus();
    // Pressing PageUp moves the thumb by ten months: past the publication's date.
    for (let press = 0; press < 3; press++) await bibliography.startThumb.press("PageUp");
    const sent = (await request).postDataJSON() as { variables: { startYear: number } };
    expect(sent.variables.startYear).toBeGreaterThanOrEqual(2022);
    await expect(bibliography.countInfo).toHaveText("Showing 0 of 0 results");
    await expect(bibliography.publications).toHaveCount(0);
  });
});
