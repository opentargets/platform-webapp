import { expect, test } from "../../../fixtures";
import { DrugBibliographySection } from "../../../POM/objects/widgets/Drug/drugBibliographySection";
import { expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DrugPage } from "../../../POM/page/drug/drug";
import { drugFacts, drugIds } from "../../../POM/page/drug/drugData";
import { expectSectionLoaded } from "../../../utils/sections";

const DEFAULT_PAGE_SIZE = 5;
const MAX_SIMILAR_ENTITIES = 15;
const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST";

type BibliographyData = {
  drug: {
    literatureOcurrences: {
      count: number;
      rows: { pmid: string | null; pmcid: string | null }[];
    };
  };
};

test.describe("Drug page: Bibliography", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description, filters and five publications", async ({ page, testConfig }) => {
    const { primary } = drugIds(testConfig);
    const facts = drugFacts(primary);
    const drugPage = new DrugPage(page);
    const bibliography = new DrugBibliographySection(page);
    await drugPage.goto(primary);
    await expectSectionLoaded(page, DrugBibliographySection.id);

    await test.step("title and description", async () => {
      await expect(drugPage.sectionTitle(DrugBibliographySection.id)).toHaveText("Bibliography");
      await expect(bibliography.description).toHaveText(
        `Scientific literature mentioning NLP-recognised entity ${facts.name} and other selected co-occurring entities. Source: Open Targets.`
      );
      await expectExternalLink(
        bibliography.description.getByRole("link", { name: "Open Targets" }),
        "http://platform-docs.opentargets.org/bibliography"
      );
    });

    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
    expect(total, "trastuzumab is mentioned in thousands of publications").toBeGreaterThan(1000);

    await test.step("all three tag categories are on", async () => {
      await expect(bibliography.section).toContainText("Tag category:");
      for (const label of ["Target", "Disease", "Drug"] as const) {
        await expect(bibliography.categoryCheckbox(label)).toBeChecked();
        await expect(bibliography.categoryCheckbox(label)).toBeEnabled();
      }
    });

    await test.step("the drug is the only selected entity", async () => {
      await expect(bibliography.drugChip).toHaveText(facts.name);
      await expect(bibliography.drugChip).toHaveAttribute("title", `ID: ${primary}`);
      await expect(bibliography.addedEntityChips).toHaveCount(0);
    });

    await test.step("co-occurring entities are offered, with score and id, the drug itself excluded", async () => {
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
      expect(ids, "trastuzumab's target is its closest co-occurring entity").toContain(
        "ENSG00000141736"
      );
    });

    await test.step("each publication links to Europe PMC and shows authors and journal", async () => {
      const ids = await bibliography.publicationIds();
      expect(new Set(ids).size).toBe(DEFAULT_PAGE_SIZE);
      for (const id of ids) {
        expect(id).toMatch(/^(\d+|PMC\d+)$/);
        const entry = bibliography.publication(id);
        const title = entry.getByRole("link").first();
        await expect(title).not.toBeEmpty();
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
    const bibliography = new DrugBibliographySection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugBibliographySection.id);
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
    const { primary } = drugIds(testConfig);
    const bibliography = new DrugBibliographySection(page);
    await new DrugPage(page).goto(primary);
    await expectSectionLoaded(page, DrugBibliographySection.id);
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
        body?.operationName === "DrugBibliographyQuery" && body.variables?.ids?.[0] === entityId
      );
    });
    await chip.click();
    await request;

    await test.step("the entity moves to the selected row", async () => {
      await expect(bibliography.addedEntityChips).toHaveText([label]);
      await expect(bibliography.addedEntityChips).toHaveAttribute("title", title);
      await expect(bibliography.drugChip).toHaveText(drugFacts(primary).name);
      await expect(
        bibliography.similarEntityChips.filter({ hasText: new RegExp(`^${label}$`) }),
        "a selected entity is no longer offered"
      ).toHaveCount(0);
    });

    let narrowed = 0;
    await test.step("fewer publications mention both", async () => {
      await expect(bibliography.countInfo).not.toHaveText(new RegExp(` of ${total} results$`));
      narrowed = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
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
    const bibliography = new DrugBibliographySection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugBibliographySection.id);
    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);

    const idsOffered = async (): Promise<string[]> => {
      await expect(bibliography.similarEntityChips.first()).toBeVisible();
      const titles = await bibliography.similarEntityChips.evaluateAll((chips) =>
        chips.map((chip) => chip.getAttribute("title") ?? "")
      );
      return titles.map((title) => title.replace(/^.* ID: /, ""));
    };
    expect((await idsOffered()).some((id) => id.startsWith("ENSG"))).toBe(true);
    expect((await idsOffered()).some((id) => id.startsWith("CHEMBL"))).toBe(true);

    await test.step("without Drug, no drug is offered", async () => {
      await bibliography.setCategory("Drug", false);
      await expect
        .poll(async () => (await idsOffered()).filter((id) => id.startsWith("CHEMBL")), {
          message: "drug chips should disappear",
        })
        .toEqual([]);
      expect((await idsOffered()).length).toBeGreaterThan(0);
    });

    await test.step("with only Disease, only diseases are offered", async () => {
      await bibliography.setCategory("Target", false);
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

    await test.step("switching the categories back on offers targets and drugs again", async () => {
      await bibliography.setCategory("Target", true);
      await bibliography.setCategory("Drug", true);
      await expect
        .poll(async () => {
          const ids = await idsOffered();
          return (
            ids.some((id) => id.startsWith("ENSG")) && ids.some((id) => id.startsWith("CHEMBL"))
          );
        })
        .toBe(true);
    });
  });

  test("a publication's abstract can be shown and hidden", async ({ page, testConfig }) => {
    const bibliography = new DrugBibliographySection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugBibliographySection.id);
    await bibliography.expectResults(DEFAULT_PAGE_SIZE);

    const [id] = await bibliography.publicationIds();
    const entry = bibliography.publication(id);
    await expect(entry.getByRole("button", { name: "Show abstract" })).toBeEnabled();
    await expect(entry.getByText("Abstract", { exact: true })).toHaveCount(0);
    await expect(entry).not.toContainText(`Abstract of ${id}`);

    await entry.getByRole("button", { name: "Show abstract" }).click();
    await expect(entry.getByRole("button", { name: "Hide abstract" })).toBeVisible();
    await expect(entry.getByText("Abstract", { exact: true })).toBeVisible();
    await expect(entry, "the abstract of this publication is rendered under it").toContainText(
      `Abstract of ${id}`
    );
    await expect(
      bibliography.section.getByText("Abstract", { exact: true }),
      "only the publication clicked is expanded"
    ).toHaveCount(1);

    await entry.getByRole("button", { name: "Hide abstract" }).click();
    await expect(entry.getByRole("button", { name: "Show abstract" })).toBeVisible();
    await expect(entry.getByText("Abstract", { exact: true })).toHaveCount(0);
    await expect(entry).not.toContainText(`Abstract of ${id}`);
  });

  test("asks Europe PMC for exactly the publications the API listed, once each", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    // Registered after the hook's stub, so this one answers and records the searches.
    const searches = await stubEuropePmc(page);
    const bibliography = new DrugBibliographySection(page);
    const firstResponse = waitForOperation<BibliographyData>(page, "DrugBibliographyQuery");
    await new DrugPage(page).goto(primary);
    const { data, variables } = await firstResponse;
    await expectSectionLoaded(page, DrugBibliographySection.id);
    await bibliography.expectResults(DEFAULT_PAGE_SIZE);

    expect(variables).toMatchObject({ id: primary, ids: [], index: 0, pageSize: 5, size: 15 });
    const apiIds = data.drug.literatureOcurrences.rows.map((row) => row.pmid || row.pmcid);
    expect(apiIds).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(await bibliography.publicationIds(), "the list follows the API's order").toEqual(apiIds);
    expect(searches, "one Europe PMC search for the first page").toEqual([apiIds]);
    await expect(bibliography.countInfo).toHaveText(
      `Showing ${DEFAULT_PAGE_SIZE} of ${data.drug.literatureOcurrences.count} results`
    );

    await test.step("the next page asks only for its own publications", async () => {
      const nextResponse = waitForOperation<BibliographyData>(page, "DrugBibliographyQuery");
      await bibliography.nextPageButton.click();
      const next = await nextResponse;
      expect(next.variables).toMatchObject({ id: primary, index: 1, pageSize: 5 });
      const nextIds = next.data.drug.literatureOcurrences.rows.map((row) => row.pmid || row.pmcid);
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
    const bibliography = new DrugBibliographySection(page);
    const firstResponse = waitForOperation<BibliographyData>(page, "DrugBibliographyQuery");
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    const { data } = await firstResponse;
    await expectSectionLoaded(page, DrugBibliographySection.id);

    const unavailable = bibliography.section.getByText("Could not download publication details");
    await expect(unavailable).toHaveCount(DEFAULT_PAGE_SIZE);
    await expect(bibliography.publications).toHaveCount(0);
    for (const row of data.drug.literatureOcurrences.rows) {
      await expect(bibliography.section).toContainText(`Publication ID: ${row.pmid || row.pmcid}`);
    }
    // The section's own data is unaffected: count, filters and pagination still work.
    await expect(bibliography.countInfo).toHaveText(
      `Showing ${DEFAULT_PAGE_SIZE} of ${data.drug.literatureOcurrences.count} results`
    );
    await expect(bibliography.nextPageButton).toBeEnabled();
    await expect(bibliography.similarEntityChips.first()).toBeVisible();
  });

  test("the date filter spans from the earliest publication to today", async ({
    page,
    testConfig,
  }) => {
    const bibliography = new DrugBibliographySection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugBibliographySection.id);
    await bibliography.expectResults(DEFAULT_PAGE_SIZE);

    await expect(bibliography.section).toContainText("Date Filter:");
    await expect(bibliography.dateSliderThumbs).toHaveCount(2);
    // Without an earliest publication year from the API the slider has no range and
    // both ends read "YYYY-MM": the filter cannot be used.
    await expect(
      bibliography.dateRangeStart,
      "the range should start at the earliest publication (year-month)"
    ).toHaveText(/^(19|20)\d{2}-\d{1,2}$/);
    await expect(bibliography.dateRangeEnd, "the range should end at the current month").toHaveText(
      new RegExp(`^${new Date().getFullYear()}-\\d{1,2}$`)
    );
    await expect(bibliography.dateSliderThumbs.last()).not.toHaveAttribute("aria-valuemax", "0");
  });

  test("a drug with fewer publications shows a consistent count", async ({ page, testConfig }) => {
    const { withParentMolecule: chemblId } = drugIds(testConfig);
    const bibliography = new DrugBibliographySection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, DrugBibliographySection.id);

    const total = await bibliography.expectResults(DEFAULT_PAGE_SIZE);
    expect(total).toBeGreaterThan(DEFAULT_PAGE_SIZE);
    await expect(bibliography.position).toHaveText(`1–${DEFAULT_PAGE_SIZE} of ${total}`);
    await expect(bibliography.drugChip).toHaveText(drugFacts(chemblId).name);
    await expect(bibliography.drugChip).toHaveAttribute("title", `ID: ${chemblId}`);
  });
});
