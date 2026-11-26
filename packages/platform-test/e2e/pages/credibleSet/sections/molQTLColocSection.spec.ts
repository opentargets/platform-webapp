import { type Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import type { TestConfig } from "../../../../types";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { MolQTLColocSection } from "../../../../POM/objects/widgets/CredibleSet/molQTLColocSection";
import { isOrdered, opposite } from "../../../../POM/objects/widgets/CredibleSet/serverTableSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { VariantPage } from "../../../../POM/page/variant/variant";
import { expectSectionLoaded, expectSections, sectionLocator } from "../../../../utils/sections";

const { column, defaultSort, operation, searchFields } = MolQTLColocSection;
const PAGE_SIZE = 10;
const THREE_DECIMALS = /^\d\.\d{3}$/;
const P_VALUE = /^\d\.\d{2}×10\s?-?\d+$/;
/** The page shows the API's study type with "qtl" in capitals: eqtl is "eQTL", sceqtl is "sceQTL". */
const STUDY_TYPE = new RegExp(`^(${MolQTLColocSection.studyTypes.join("|")})\\s*(trans)?$`, "i");

/** The credible sets these tests use; fails loudly if the test config lacks one. */
function credibleSets(config: TestConfig): { primary: string; qtl: string } {
  const { primary, qtl } = config.credibleSet ?? {};
  if (!primary || !qtl) throw new Error("the test config needs credibleSet.primary and credibleSet.qtl");
  return { primary, qtl };
}

async function open(page: Page, credibleSetId: string): Promise<MolQTLColocSection> {
  await new CredibleSetPage(page).goToCredibleSetPage(credibleSetId);
  await expectSectionLoaded(page, MolQTLColocSection.id);
  const coloc = new MolQTLColocSection(page);
  await expect(coloc.rows.first()).toBeVisible();
  await coloc.expectSettled();
  return coloc;
}

/**
 * Search for a term, check the query it sends, and return how many colocalisations match
 * once the table has shown them (the footer count and the rows arrive together).
 */
async function searchFor(coloc: MolQTLColocSection, credibleSetId: string, term: string): Promise<number> {
  const before = await coloc.total();
  const variables = await coloc.search(term);
  expect(variables, "a search asks the server for the first page, keeping the sort").toEqual({
    credibleSetId,
    index: 0,
    size: PAGE_SIZE,
    sort: [defaultSort],
    search: { text: term, fields: searchFields },
  });
  await expect.poll(() => coloc.total(), { message: "the footer should count the matches" }).not.toBe(before);
  const total = await coloc.total();
  await expect(coloc.rows).toHaveCount(Math.min(total, PAGE_SIZE));
  return total;
}

type ColocRow = {
  studyType: string;
  isTransQtl: boolean | null;
  targetId: string | null;
  targetApprovedSymbol: string | null;
  biosampleId: string | null;
  biosampleName: string | null;
  condition: string | null;
  betaRatioSignAverage: number | null;
};

/** Show 100 per page and return the rows the API answered with, as the table received them. */
async function rowsOfHundred(page: Page, coloc: MolQTLColocSection): Promise<ColocRow[]> {
  const response = page.waitForResponse(
    (candidate) =>
      (candidate.request().postData() ?? "").includes(operation) &&
      (candidate.request().postData() ?? "").includes('"size":100')
  );
  await coloc.resize(100);
  const body = (await (await response).json()) as {
    data: { credibleSet: { molqtlcolocalisation: { rows: ColocRow[] } } };
  };
  const rows = body.data.credibleSet.molqtlcolocalisation.rows;
  await expect(coloc.rows).toHaveCount(rows.length);
  return rows;
}

test.describe("Credible set page: molQTL colocalisation", () => {
  test("shows title, description, the column headers and the table controls", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);

    await test.step("title and description", async () => {
      await expect(page.getByTestId("section-molqtl-coloc-header")).toHaveText("MolQTL Colocalisation");
      await expect(coloc.description).toHaveText(
        "Colocalisation metrics for overlapping credible sets from molecular QTL studies. Source: Open Targets"
      );
      await expect(coloc.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/credible-set#colocalisation"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(coloc.headers).toHaveText(MolQTLColocSection.headers);
    });

    await test.step("the toolbar offers search, columns, export and the API query", async () => {
      await expect(coloc.table.searchInput).toHaveAttribute("placeholder", MolQTLColocSection.searchPlaceholder);
      await expect(coloc.table.columnsButton).toBeVisible();
      await expect(coloc.table.exportButton).toBeVisible();
      await expect(coloc.table.apiQueryButton).toBeVisible();
    });

    await test.step("header tooltips explain H3, H4 and CLPP", async () => {
      const tooltips: Record<string, string> = {
        H3: "Posterior probability that the signals do not colocalise",
        H4: "Posterior probability that the signals colocalise",
        CLPP: "The sum of the products of the fine-mapping posterior probabilities for overlapping variants between two study loci",
      };
      for (const [name, text] of Object.entries(tooltips)) {
        await coloc.headers.filter({ hasText: name }).locator("sup").hover();
        await expect(page.getByRole("tooltip")).toHaveText(text);
        await page.mouse.move(0, 0);
        await expect(page.getByRole("tooltip")).toHaveCount(0);
      }
    });
  });

  test("opens on the first page of molQTL colocalisations, highest H4 first", async ({
    page,
    testConfig,
    graphqlMonitor,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const coloc = await open(page, credibleSetId);
    await graphqlMonitor.settle();

    await test.step("the first query asks for ten rows sorted by H4, with no search", async () => {
      const [first] = graphqlMonitor.named(operation);
      expect(first.variables).toEqual({ credibleSetId, index: 0, size: PAGE_SIZE, sort: [defaultSort] });
      expect(first.errors).toEqual([]);
    });

    await test.step("the rows run from the highest H4 down, and the H4 header says so", async () => {
      await coloc.expectColumnOrdered(column.h4, "number", "DESCENDING");
      await expect(coloc.table.header(/^H4/).locator("svg[data-icon='arrow-down']")).toHaveCount(1);
    });

    await test.step("only molecular QTL studies are listed, never GWAS", async () => {
      for (const type of await coloc.columnTexts(column.type)) {
        expect(MolQTLColocSection.studyTypes, `"${type}" is a molQTL study type`).toContain(
          type.replace(/\s*trans$/, "").toLowerCase()
        );
      }
      for (let index = 0; index < PAGE_SIZE; index += 1) {
        await expect(
          coloc.studyLink(index),
          "molQTL study ids are QTL study ids, not GCST accessions"
        ).not.toHaveAttribute("href", /^\/study\/GCST/);
      }
    });
  });

  test("every row has real values in every column", async ({ page, testConfig }) => {
    const primary = credibleSets(testConfig).primary;
    const coloc = await open(page, primary);
    await expect(coloc.rows).toHaveCount(PAGE_SIZE);
    const total = await coloc.total();
    expect(total, "the credible set has more colocalisations than fit on one page").toBeGreaterThan(
      PAGE_SIZE
    );
    await coloc.expectPosition(1, PAGE_SIZE, total);

    for (let index = 0; index < PAGE_SIZE; index += 1) {
      await test.step(`row ${index + 1}`, async () => {
        await expect(coloc.credibleSetLink(index)).toHaveText("View");
        await expect(coloc.credibleSetLink(index)).toHaveAttribute("href", /^\/credible-set\/[0-9a-f]{32}$/);
        await expect(coloc.credibleSetLink(index)).not.toHaveAttribute("href", `/credible-set/${primary}`);
        await expect(coloc.studyLink(index)).toHaveAttribute("href", /^\/study\/qts\S+$/);
        await expect(coloc.cell(index, column.type)).toHaveText(STUDY_TYPE);
        await expect(coloc.link(index, column.gene)).toHaveAttribute("href", /^\/target\/ENSG\d{11}$/);
        await expect(coloc.link(index, column.gene)).toHaveText(/^[A-Za-z0-9._-]+$/);
        await expect(coloc.link(index, column.tissue)).toHaveAttribute(
          "href",
          /^https:\/\/www\.ebi\.ac\.uk\/ols4\/search\?q=[A-Z]+_\d+$/
        );
        await expect(coloc.cell(index, column.tissue)).toHaveText(/\S/);
        await expect(coloc.cell(index, column.condition)).toHaveText(/\S/);
        await expect(coloc.leadVariantLink(index)).toHaveAttribute(
          "href",
          /^\/variant\/(\d+|X|Y|MT)_\d+_[ACGT]+_[ACGT]+$/
        );
        await expect(coloc.cell(index, column.pValue)).toHaveText(P_VALUE);
        await expect(coloc.cell(index, column.variants)).toHaveText(/^\d{1,3}(,\d{3})*$/);
        await expect(coloc.directionality(index)).toHaveText(/^(Same|Opposite|Inconclusive|N\/A)$/);
        for (const metric of [column.h3, column.h4, column.clpp]) {
          await expect(coloc.cell(index, metric)).toHaveText(THREE_DECIMALS);
        }
      });
    }

    await test.step("H3 and H4 are probabilities of exclusive hypotheses, so they sum to at most 1", async () => {
      const h3 = (await coloc.columnTexts(column.h3)).map(Number);
      const h4 = (await coloc.columnTexts(column.h4)).map(Number);
      h3.forEach((value, index) => {
        expect(value + h4[index], `row ${index + 1}`).toBeLessThanOrEqual(1.002);
      });
    });
  });

  test("Type, Affected gene, Affected tissue/cell, trans chip and Directionality match what the API returned", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const rows = await rowsOfHundred(page, coloc);

    await test.step("Type is the study type, with a trans chip for a trans QTL", async () => {
      expect(await coloc.columnTexts(column.type)).toEqual(
        rows.map(
          (row) =>
            `${row.studyType.replace(/(qtl|gwas)/gi, (match) => match.toUpperCase())}${row.isTransQtl ? " trans" : ""}`
        )
      );
      await expect(coloc.section.getByText("trans", { exact: true })).toHaveCount(
        rows.filter((row) => row.isTransQtl).length
      );
    });

    await test.step("Affected gene and Affected tissue/cell show the values, never the '?API?' placeholder", async () => {
      const genes = await coloc.columnTexts(column.gene);
      const tissues = await coloc.columnTexts(column.tissue);
      expect(genes).toEqual(rows.map((row) => row.targetApprovedSymbol || row.targetId || "N/A"));
      expect(tissues).toEqual(rows.map((row) => row.biosampleName || row.biosampleId || "N/A"));
      await expect(coloc.section.getByText("?API?")).toHaveCount(0);
    });

    await test.step("Condition shows the API's condition", async () => {
      expect(await coloc.columnTexts(column.condition)).toEqual(rows.map((row) => row.condition || "N/A"));
    });

    await test.step("Directionality is the sign of the beta ratio", async () => {
      const expected = rows.map((row) => {
        const value = row.betaRatioSignAverage;
        if (value === null) return "N/A";
        if (value <= -0.99) return "Opposite";
        return value >= 0.99 ? "Same" : "Inconclusive";
      });
      expect(await coloc.columnTexts(column.directionality)).toEqual(expected);
    });
  });

  test("Directionality tooltip gives the beta ratio sign average", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    await coloc.resize(100);
    await expect(coloc.rows).toHaveCount(100);

    for (const { label, sign } of [
      { label: "Same", sign: 1 },
      { label: "Opposite", sign: -1 },
    ]) {
      await test.step(label, async () => {
        const cell = coloc.rows
          .locator(`td:nth-child(${column.directionality + 1})`)
          .filter({ hasText: new RegExp(`^${label}$`) })
          .first();
        await expect(cell, `the credible set has a "${label}" colocalisation`).toBeVisible();
        await cell.getByText(label, { exact: true }).hover();
        const tooltip = page.getByRole("tooltip");
        await expect(tooltip).toHaveText(/^Beta ratio sign average: -?\d(\.\d+)?$/);
        const value = Number((await tooltip.innerText()).replace("Beta ratio sign average: ", ""));
        expect(value * sign).toBeGreaterThanOrEqual(0.99);
        await page.mouse.move(0, 0);
        await expect(tooltip).toHaveCount(0);
      });
    }
  });

  test.describe("pagination and page size", () => {
    test("pages through the server and keeps the sort on every page", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await coloc.total();
      expect(total, "more than 100 molQTL colocalisations, so three page sizes differ").toBeGreaterThan(100);
      const lastIndex = Math.ceil(total / PAGE_SIZE) - 1;
      const firstPage = await coloc.table.rowTexts();
      const firstPageH4 = (await coloc.columnTexts(column.h4)).map(Number);
      await coloc.table.expectFirstPage();

      await test.step("next asks the API for page 2 and shows different, lower-H4 rows", async () => {
        const requested = await coloc.pageTo(coloc.table.nextPageButton, 1);
        expect(requested).toEqual({ credibleSetId, index: 1, size: PAGE_SIZE, sort: [defaultSort] });
        await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
        await coloc.table.expectRowsChangedFrom(firstPage);
        await expect(coloc.rows).toHaveCount(PAGE_SIZE);
        const secondPageH4 = (await coloc.columnTexts(column.h4)).map(Number);
        expect(secondPageH4[0], "page 2 continues the order where page 1 ended").toBeLessThanOrEqual(
          firstPageH4[firstPageH4.length - 1]
        );
        expect(isOrdered(secondPageH4, "DESCENDING")).toBe(true);
      });

      await test.step("previous returns to exactly the first page", async () => {
        await coloc.table.previousPageButton.click();
        await coloc.expectPosition(1, PAGE_SIZE, total);
        await coloc.table.expectRowTexts(firstPage);
        await coloc.table.expectFirstPage();
      });

      await test.step("last asks for the final page and shows the remainder", async () => {
        const requested = await coloc.pageTo(coloc.table.lastPageButton, lastIndex);
        expect(requested.sort).toEqual([defaultSort]);
        await coloc.expectPosition(lastIndex * PAGE_SIZE + 1, total, total);
        await expect(coloc.rows).toHaveCount(total - lastIndex * PAGE_SIZE);
        await coloc.table.expectLastPage();
      });

      await test.step("first jumps back", async () => {
        await coloc.table.firstPageButton.click();
        await coloc.table.expectRowTexts(firstPage);
        await coloc.table.expectFirstPage();
      });
    });

    test("a new page size asks for that many rows from page 1, and the last page holds the remainder", async ({
      page,
      testConfig,
    }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const total = await coloc.total();
      await expect(coloc.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
      await coloc.pageTo(coloc.table.nextPageButton, 1);

      await test.step("25 per page starts again at page 1", async () => {
        const requested = await coloc.resize(25);
        expect(requested).toMatchObject({ index: 0, size: 25, sort: [defaultSort] });
        await coloc.expectPosition(1, 25, total);
        await expect(coloc.rows).toHaveCount(25);
      });

      await test.step("with 100 per page the last page holds the remainder", async () => {
        await coloc.resize(100);
        await coloc.expectPosition(1, 100, total);
        const lastIndex = Math.ceil(total / 100) - 1;
        const requested = await coloc.pageTo(coloc.table.lastPageButton, lastIndex);
        expect(requested.size).toBe(100);
        await coloc.expectPosition(lastIndex * 100 + 1, total, total);
        await expect(coloc.rows).toHaveCount(total - lastIndex * 100);
        await coloc.table.expectLastPage();
      });
    });
  });

  test.describe("search", () => {
    test("the search box asks the server to look in study, gene, tissue and lead variant", async ({
      page,
      testConfig,
    }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const variables = await coloc.search("GGCX");
      expect(variables.search).toEqual({ text: "GGCX", fields: searchFields });
      expect(variables.search?.fields, "the condition column is not searched").not.toContain("CONDITION");
    });

    test("by gene symbol keeps only that gene's colocalisations, over all pages", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const all = await coloc.total();

      const total = await searchFor(coloc, credibleSetId, "GGCX");
      expect(total).toBeGreaterThan(PAGE_SIZE);
      expect(total).toBeLessThan(all);
      await coloc.expectPosition(1, PAGE_SIZE, total);
      for (const gene of await coloc.columnTexts(column.gene)) expect(gene).toBe("GGCX");

      await test.step("the next page of the matches holds matches too", async () => {
        const requested = await coloc.pageTo(coloc.table.nextPageButton, 1);
        expect(requested.search).toEqual({ text: "GGCX", fields: searchFields });
        await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
        for (const gene of await coloc.columnTexts(column.gene)) expect(gene).toBe("GGCX");
      });
    });

    test("by tissue name keeps only rows with that tissue", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const all = await coloc.total();

      const total = await searchFor(coloc, credibleSetId, "cerebellum");
      expect(total).toBeGreaterThan(1);
      expect(total).toBeLessThan(all);
      for (const text of await coloc.table.rowTexts()) expect(text.toLowerCase()).toContain("cerebellum");
    });

    test("by lead variant id keeps only credible sets led by that variant", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const variantId = (await coloc.leadVariantLink(0).innerText()).trim();

      const total = await searchFor(coloc, credibleSetId, variantId);
      expect(total).toBeGreaterThan(0);
      for (const lead of await coloc.columnTexts(column.leadVariant)) expect(lead).toBe(variantId);
    });

    test("by study id finds that study", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const studyId = (await coloc.studyLink(0).innerText()).trim();

      const total = await searchFor(coloc, credibleSetId, studyId);
      expect(total).toBeGreaterThan(0);
      await expect(coloc.studyLink(0)).toHaveText(studyId);
    });

    test("a term nothing matches leaves an empty table, and clearing it restores the list", async ({
      page,
      testConfig,
    }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const total = await coloc.total();
      const firstPage = await coloc.table.rowTexts();

      await coloc.search("zzz-no-colocalisation-matches-this");
      await expect(coloc.table.pagePosition).toHaveText("1 - 0 of 0");
      await expect(coloc.rows).toHaveCount(0);
      await coloc.table.expectHeaders(MolQTLColocSection.headers);
      await coloc.table.expectFirstPage(true);

      await coloc.clearSearch();
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await coloc.table.expectRowTexts(firstPage);
      await coloc.table.expectFirstPage();
    });

    test("searching while on a later page goes back to the first page", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      await coloc.pageTo(coloc.table.nextPageButton, 1);
      await expect(coloc.table.pagePosition).toHaveText(/^11 - 20 of \d+$/);

      await searchFor(coloc, credibleSetId, "GGCX");
      await expect(coloc.table.pagePosition).toHaveText(/^1 - 10 of \d+$/);
      await coloc.table.expectFirstPage();
    });
  });

  test.describe("sorting", () => {
    for (const sortable of MolQTLColocSection.sortable) {
      test(`${sortable.header} is sorted by the server and the rows follow it`, async ({ page, testConfig }) => {
        const credibleSetId = credibleSets(testConfig).primary;
        const coloc = await open(page, credibleSetId);
        const total = await coloc.total();
        const byDefault = await coloc.table.rowTexts();
        const isDefault = sortable.key === defaultSort.key;
        await expect(coloc.sortIcon(sortable.header)).toHaveCount(1);

        const first = await coloc.clickSort(sortable.header, sortable.key);
        expect(first).toHaveLength(1);
        const direction = first[0].direction;
        if (isDefault) expect(direction, "the default order is reversed").toBe(opposite(defaultSort.direction));
        await coloc.table.expectRowsChangedFrom(byDefault);
        await coloc.expectPosition(1, PAGE_SIZE, total);
        await coloc.expectColumnOrdered(sortable.column, sortable.kind, direction);
        const firstSorted = await coloc.table.rowTexts();

        if (isDefault) {
          // the column already sorted the table: the second click clears the sort
          expect(await coloc.clickSort(sortable.header, null)).toEqual([]);
          return;
        }
        const second = await coloc.clickSort(sortable.header, sortable.key);
        expect(second[0].direction, "a second click reverses the order").toBe(opposite(direction));
        await coloc.table.expectRowsChangedFrom(firstSorted);
        await coloc.expectColumnOrdered(sortable.column, sortable.kind, opposite(direction));
        await coloc.expectPosition(1, PAGE_SIZE, total);
      });
    }

    test("columns without a sort field have no sort control and clicking them leaves the table as it was", async ({
      page,
      testConfig,
    }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const byDefault = await coloc.table.rowTexts();
      for (const name of MolQTLColocSection.notSortable) {
        await expect(coloc.sortIcon(name), `${name} has no sort arrow`).toHaveCount(0);
      }
      await coloc.table.clickHeader("Affected gene");
      await coloc.table.clickHeader("Condition");
      await expect(coloc.rows).toHaveCount(PAGE_SIZE);
      await coloc.table.expectRowTexts(byDefault);
    });

    test("the order is global: page 2 continues where page 1 of the sorted list ends", async ({
      page,
      testConfig,
    }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const total = await coloc.total();
      const byDefault = await coloc.table.rowTexts();
      const sort = await coloc.clickSort("H4", "H4");
      expect(sort[0].direction).toBe("ASCENDING");
      await coloc.table.expectRowsChangedFrom(byDefault);
      await coloc.expectColumnOrdered(column.h4, "number", "ASCENDING");
      const page1 = (await coloc.columnTexts(column.h4)).map(Number);
      const page1Rows = await coloc.table.rowTexts();

      const requested = await coloc.pageTo(coloc.table.nextPageButton, 1);
      expect(requested.sort).toEqual(sort);
      await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
      await coloc.table.expectRowsChangedFrom(page1Rows);
      await coloc.expectColumnOrdered(column.h4, "number", "ASCENDING");
      const page2 = (await coloc.columnTexts(column.h4)).map(Number);
      expect(page2[0], "page 2 starts at or above where page 1 ended").toBeGreaterThanOrEqual(
        page1[page1.length - 1]
      );
    });

    test("search and sort work together: the matches are sorted, on every page", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await searchFor(coloc, credibleSetId, "GGCX");
      const before = await coloc.table.rowTexts();

      const sort = await coloc.clickSort("P-Value", "P_VALUE");
      await coloc.table.expectRowsChangedFrom(before);
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await coloc.expectColumnOrdered(column.pValue, "pValue", sort[0].direction);
      for (const gene of await coloc.columnTexts(column.gene)) expect(gene).toBe("GGCX");

      const requested = await coloc.pageTo(coloc.table.nextPageButton, 1);
      expect(requested.sort).toEqual(sort);
      expect(requested.search).toEqual({ text: "GGCX", fields: searchFields });
      await coloc.expectColumnOrdered(column.pValue, "pValue", sort[0].direction);
    });
  });

  test("the Columns control hides and shows columns, but not the credible set link", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const list = await coloc.table.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(MolQTLColocSection.headers.length);

    await test.step("unchecking Condition removes the column", async () => {
      await list.getByRole("checkbox", { name: "Condition" }).uncheck();
      await expect(coloc.headers).toHaveCount(MolQTLColocSection.headers.length - 1);
      await expect(coloc.headers.filter({ hasText: "Condition" })).toHaveCount(0);
      await expect(coloc.rows.first().locator("td")).toHaveCount(MolQTLColocSection.headers.length - 1);
    });

    await test.step("checking it again brings it back in place", async () => {
      await list.getByRole("checkbox", { name: "Condition" }).check();
      await expect(coloc.headers).toHaveText(MolQTLColocSection.headers);
    });
  });

  test.describe("export", () => {
    test("downloads every colocalisation as JSON and TSV", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await coloc.total();
      const firstPageStudies = await Promise.all(
        Array.from({ length: PAGE_SIZE }, (_, index) => coloc.studyLink(index).innerText())
      );

      await test.step("JSON holds all rows, not just the page on screen, in the table's order", async () => {
        const { filename, text } = await coloc.table.download("Json");
        expect(filename).toBe(`${credibleSetId}-credibleSets.json`);
        const rows = JSON.parse(text) as Record<string, unknown>[];
        expect(rows).toHaveLength(total);
        expect(rows.slice(0, PAGE_SIZE).map((row) => row.study)).toEqual(firstPageStudies);
        expect(isOrdered(rows.map((row) => row.h4 as number), "DESCENDING")).toBe(true);
        expect(Object.keys(rows[0])).toEqual([
          "credibleSet",
          "study",
          "type",
          "affectedGene",
          "affectedTissueCell",
          "condition",
          "leadVariant",
          "pValue",
          "colocalisingVariantsN",
          "directionality",
          "h3",
          "h4",
          "clpp",
        ]);
        expect(typeof rows[0].h4).toBe("number");
      });

      await test.step("TSV has a header line and one line per row", async () => {
        const { filename, text } = await coloc.table.download("TSV");
        expect(filename).toBe(`${credibleSetId}-credibleSets.tsv`);
        expect(text.trimEnd().split("\n")).toHaveLength(total + 1);
      });
    });

    test("the exported Type says whether the QTL is trans", async ({ page, testConfig }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const { text } = await coloc.table.download("Json");
      const rows = JSON.parse(text) as { type: string }[];
      for (const row of rows) {
        expect(row.type).toMatch(/^[a-z]+, isTrans:(true|false)$/);
      }
    });

    test("the exported gene and tissue are names, not the '?API?' placeholder", async ({ page, testConfig }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const { text } = await coloc.table.download("Json");
      const rows = JSON.parse(text) as { affectedGene: string; affectedTissueCell: string }[];
      expect(text).not.toContain("?API?");
      for (const row of rows) {
        expect(row.affectedGene).not.toBe("");
        expect(row.affectedTissueCell).not.toBe("");
      }
    });

    test("with a search and a sort active the file holds the matching rows in that order", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await searchFor(coloc, credibleSetId, "GGCX");
      const sort = await coloc.clickSort("CLPP", "CLPP");
      await coloc.expectColumnOrdered(column.clpp, "number", sort[0].direction);

      const { text } = await coloc.table.download("Json");
      const rows = JSON.parse(text) as { affectedGene: string; clpp: number }[];
      expect(rows, "one exported row per match").toHaveLength(total);
      for (const row of rows) expect(row.affectedGene).toBe("GGCX");
      expect(
        isOrdered(
          rows.map((row) => row.clpp),
          sort[0].direction
        ),
        "the file follows the table's sort"
      ).toBe(true);
    });
  });

  test("the API query drawer holds the table query and the variables of the search and sort", async ({
    page,
    testConfig,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const coloc = await open(page, credibleSetId);
    await coloc.expectApiQuery(['"key": "H4"', '"direction": "DESCENDING"']);

    await searchFor(coloc, credibleSetId, "GGCX");
    await coloc.clickSort("P-Value", "P_VALUE");
    await coloc.expectApiQuery(['"key": "P_VALUE"', '"text": "GGCX"', '"TARGET_APPROVED_SYMBOL"']);
  });

  test("the credible set link opens the colocalising credible set", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const href = await coloc.credibleSetLink(0).getAttribute("href");
    await coloc.credibleSetLink(0).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(new CredibleSetPage(page).title).toHaveText("Credible set");
    await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
  });

  test("the study link opens that QTL study's page", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const studyId = (await coloc.studyLink(0).innerText()).trim();
    await coloc.studyLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/study/${studyId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toBeVisible();
  });

  test("the gene link opens that gene's target page", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const symbol = (await coloc.link(0, column.gene).innerText()).trim();
    const href = (await coloc.link(0, column.gene).getAttribute("href")) ?? "";
    await coloc.link(0, column.gene).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(symbol);
  });

  test("the lead variant link opens that variant's page", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const href = (await coloc.leadVariantLink(0).getAttribute("href")) ?? "";
    await coloc.leadVariantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    const variantPage = new VariantPage(page);
    await variantPage.waitForVariantPageLoad();
    await expect(variantPage.title).toContainText(href.replace("/variant/", "").split("_")[1]);
  });

  test("is absent for the pQTL credible set, which colocalises with no molQTL", async ({
    page,
    testConfig,
  }) => {
    const { qtl } = credibleSets(testConfig);
    await new CredibleSetPage(page).goToCredibleSetPage(qtl);
    await expectSections(page, expectedSectionsFor(qtl));
    await expect(sectionLocator(page, MolQTLColocSection.id)).toHaveCount(0);
    await expect(page.getByTestId("section-molqtl-coloc-header")).toHaveCount(0);
  });
});
