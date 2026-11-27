import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { GWASColocSection } from "../../../../POM/objects/widgets/CredibleSet/gwasColocSection";
import {
  isOrdered,
  opposite,
} from "../../../../POM/objects/widgets/CredibleSet/serverTableSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { VariantPage } from "../../../../POM/page/variant/variant";
import type { TestConfig } from "../../../../types";
import { expectSectionLoaded, expectSections, sectionLocator } from "../../../../utils/sections";

const { column, defaultSort, searchFields } = GWASColocSection;
const PAGE_SIZE = 10;
const THREE_DECIMALS = /^\d\.\d{3}$/;
const P_VALUE = /^\d\.\d{2}×10\s?-?\d+$/;
const DIRECTIONS = ["Same", "Opposite", "Inconclusive", "N/A"];

/** The credible sets these tests use; fails loudly if the test config lacks one. */
function credibleSets(config: TestConfig): { primary: string; qtl: string } {
  const { primary, qtl } = config.credibleSet ?? {};
  if (!primary || !qtl)
    throw new Error("the test config needs credibleSet.primary and credibleSet.qtl");
  return { primary, qtl };
}

async function open(page: Page, credibleSetId: string): Promise<GWASColocSection> {
  await new CredibleSetPage(page).goToCredibleSetPage(credibleSetId);
  await expectSectionLoaded(page, GWASColocSection.id);
  const coloc = new GWASColocSection(page);
  await expect(coloc.rows.first()).toBeVisible();
  await coloc.expectSettled();
  return coloc;
}

/**
 * Search for a term, check the query it sends, and return how many colocalisations match
 * once the table has shown them (the footer count and the rows arrive together).
 */
async function searchFor(
  coloc: GWASColocSection,
  credibleSetId: string,
  term: string
): Promise<number> {
  const before = await coloc.total();
  const variables = await coloc.search(term);
  expect(variables, "a search asks the server for the first page, keeping the sort").toEqual({
    credibleSetId,
    index: 0,
    size: PAGE_SIZE,
    sort: [defaultSort],
    search: { text: term, fields: searchFields },
  });
  await expect
    .poll(() => coloc.total(), { message: "the footer should count the matches" })
    .not.toBe(before);
  const total = await coloc.total();
  await expect(coloc.rows).toHaveCount(Math.min(total, PAGE_SIZE));
  return total;
}

test.describe("Credible set page: GWAS colocalisation", () => {
  test("shows title, description, the column headers and the table controls", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);

    await test.step("title and description", async () => {
      await expect(page.getByTestId("section-gwas-coloc-header")).toHaveText("GWAS Colocalisation");
      await expect(coloc.description).toHaveText(
        "Colocalisation metrics for overlapping GWAS credible sets. Source: Open Targets"
      );
      await expect(coloc.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/credible-set#colocalisation"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(coloc.headers).toHaveText(GWASColocSection.headers);
    });

    await test.step("the toolbar offers search, columns, export and the API query", async () => {
      await expect(coloc.table.searchInput).toHaveAttribute(
        "placeholder",
        GWASColocSection.searchPlaceholder
      );
      await expect(coloc.table.columnsButton).toBeVisible();
      await expect(coloc.table.exportButton).toBeVisible();
      await expect(coloc.table.apiQueryButton).toBeVisible();
    });

    await test.step("header tooltips explain Directionality, H3, H4 and CLPP", async () => {
      const tooltips: Record<string, string> = {
        Directionality:
          "Effect directionality based on the ratio of betas between the two credible sets",
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

  test("opens on the first page of GWAS colocalisations, highest H4 first", async ({
    page,
    testConfig,
    graphqlMonitor,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const coloc = await open(page, credibleSetId);
    await graphqlMonitor.settle();

    await test.step("the first query asks for ten rows sorted by H4, with no search", async () => {
      const [first] = graphqlMonitor.named(GWASColocSection.operation);
      expect(first.variables).toEqual({
        credibleSetId,
        index: 0,
        size: PAGE_SIZE,
        sort: [defaultSort],
      });
      expect(first.errors).toEqual([]);
    });

    await test.step("the rows run from the highest H4 down, and the H4 header says so", async () => {
      await coloc.expectColumnOrdered(column.h4, "number", "DESCENDING");
      await expect(coloc.table.header(/^H4/).locator("svg[data-icon='arrow-down']")).toHaveCount(1);
    });

    await test.step("only GWAS studies are listed, never molecular QTL ones", async () => {
      for (let index = 0; index < PAGE_SIZE; index += 1) {
        await expect(coloc.studyLink(index)).not.toHaveAttribute("href", /^\/study\/qts/);
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
        await expect(coloc.credibleSetLink(index)).toHaveAttribute(
          "href",
          /^\/credible-set\/[0-9a-f]{32}$/
        );
        await expect(
          coloc.credibleSetLink(index),
          "a set never colocalises with itself"
        ).not.toHaveAttribute("href", `/credible-set/${primary}`);
        await expect(coloc.studyLink(index)).toHaveAttribute("href", /^\/study\/\S+$/);
        await expect(coloc.studyLink(index)).toHaveText(/^\S+$/);
        await expect(coloc.cell(index, column.trait)).toHaveText(/\S/);
        await expect(coloc.cell(index, column.author)).toHaveText(/\S/);
        await expect(coloc.leadVariantLink(index)).toHaveAttribute(
          "href",
          /^\/variant\/(\d+|X|Y|MT)_\d+_[ACGT]+_[ACGT]+$/
        );
        await expect(coloc.cell(index, column.pValue)).toHaveText(P_VALUE);
        await expect(coloc.cell(index, column.variants)).toHaveText(/^\d{1,3}(,\d{3})*$/);
        await expect(coloc.directionality(index)).toHaveText(
          new RegExp(`^(${DIRECTIONS.join("|")})$`)
        );
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

    await test.step("the credible sets listed are all different", async () => {
      const hrefs = await coloc.section
        .locator("tbody tr td:first-child a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      expect(new Set(hrefs).size).toBe(PAGE_SIZE);
    });
  });

  test("Directionality names the sign of the beta ratio and its tooltip gives the value", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    // Show every colocalisation the set has that fits on one page of 100
    await coloc.resize(100);
    await expect(coloc.rows).toHaveCount(100);

    const cases = [
      { label: "Same", sign: 1 },
      { label: "Opposite", sign: -1 },
    ];
    for (const { label, sign } of cases) {
      await test.step(`${label}: beta ratio sign average is ${sign > 0 ? "at least 0.99" : "at most -0.99"}`, async () => {
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

    await test.step("a missing ratio shows N/A, not Inconclusive", async () => {
      await expect(
        coloc.rows
          .locator(`td:nth-child(${column.directionality + 1})`)
          .filter({ hasText: /^N\/A$/ })
          .first()
      ).toBeVisible();
    });
  });

  test.describe("pagination and page size", () => {
    test("pages through the server: next, previous, last and first, keeping the sort", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await coloc.total();
      const lastIndex = Math.ceil(total / PAGE_SIZE) - 1;
      const firstPage = await coloc.table.rowTexts();
      const firstPageH4 = (await coloc.columnTexts(column.h4)).map(Number);
      await coloc.table.expectFirstPage();

      await test.step("next asks the API for page 2 and shows different, lower-H4 rows", async () => {
        const requested = await coloc.pageTo(coloc.table.nextPageButton, 1);
        expect(requested).toEqual({
          credibleSetId,
          index: 1,
          size: PAGE_SIZE,
          sort: [defaultSort],
        });
        await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
        await coloc.table.expectRowsChangedFrom(firstPage);
        await expect(coloc.rows).toHaveCount(PAGE_SIZE);
        await expect(coloc.table.previousPageButton).toBeEnabled();
        await expect(coloc.table.firstPageButton).toBeEnabled();
        const secondPageH4 = (await coloc.columnTexts(column.h4)).map(Number);
        expect(
          secondPageH4[0],
          "page 2 continues the order where page 1 ended"
        ).toBeLessThanOrEqual(firstPageH4[firstPageH4.length - 1]);
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

      await test.step("first jumps back from the last page", async () => {
        await coloc.table.firstPageButton.click();
        await coloc.expectPosition(1, PAGE_SIZE, total);
        await coloc.table.expectRowTexts(firstPage);
        await coloc.table.expectFirstPage();
      });
    });

    test("page size changes the rows per page, restarts at page 1 and the last page holds the remainder", async ({
      page,
      testConfig,
    }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const total = await coloc.total();
      await expect(coloc.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
      await coloc.pageTo(coloc.table.nextPageButton, 1);
      await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);

      await test.step("25 per page asks for 25 rows from page 1", async () => {
        const requested = await coloc.resize(25);
        expect(requested).toMatchObject({ index: 0, size: 25, sort: [defaultSort] });
        await coloc.expectPosition(1, 25, total);
        await expect(coloc.rows).toHaveCount(25);
      });

      await test.step("100 per page, then the last page has the remainder and next is off", async () => {
        await coloc.resize(100);
        await coloc.expectPosition(1, 100, total);
        await expect(coloc.rows).toHaveCount(100);
        await coloc.table.nextPageButton.click();
        await coloc.expectPosition(101, total, total);
        await expect(coloc.rows).toHaveCount(total - 100);
        await coloc.table.expectLastPage();
      });

      await test.step("page 2 rows differ from page 1 rows", async () => {
        const secondPage = await coloc.table.rowTexts();
        await coloc.table.firstPageButton.click();
        await coloc.table.expectRowsChangedFrom(secondPage);
      });
    });
  });

  test.describe("search", () => {
    test("the search box asks the server to look in study, trait, author and lead variant", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      await expect(coloc.table.searchInput).toHaveAttribute("placeholder", "Search all columns...");

      const variables = await coloc.search("prostate");
      expect(variables.search).toEqual({ text: "prostate", fields: searchFields });
      expect(variables.search?.fields, "the p-value and H4 columns are not searched").not.toContain(
        "H4"
      );
    });

    test("by first author keeps only that author's colocalisations, over all pages", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const all = await coloc.total();

      const total = await searchFor(coloc, credibleSetId, "Verma");
      expect(total).toBeGreaterThan(PAGE_SIZE);
      expect(total).toBeLessThan(all);
      await coloc.expectPosition(1, PAGE_SIZE, total);
      for (const author of await coloc.columnTexts(column.author))
        expect(author).toContain("Verma");

      await test.step("the next page of the matches holds matches too", async () => {
        const requested = await coloc.pageTo(coloc.table.nextPageButton, 1);
        expect(requested.search).toEqual({ text: "Verma", fields: searchFields });
        await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
        for (const author of await coloc.columnTexts(column.author))
          expect(author).toContain("Verma");
      });
    });

    test("by reported trait keeps only rows with that trait", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const all = await coloc.total();

      const total = await searchFor(coloc, credibleSetId, "prostate");
      expect(total).toBeGreaterThan(1);
      expect(total).toBeLessThan(all);
      for (const trait of await coloc.columnTexts(column.trait)) {
        expect(trait.toLowerCase()).toContain("prostate");
      }
    });

    test("by lead variant id keeps only credible sets led by that variant", async ({
      page,
      testConfig,
    }) => {
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
      for (const study of await coloc.columnTexts(column.study)) expect(study).toContain(studyId);
    });

    test("a term nothing matches leaves an empty table, and clearing it restores the list", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await coloc.total();
      const firstPage = await coloc.table.rowTexts();

      await coloc.search("zzz-no-colocalisation-matches-this");
      await expect(coloc.table.pagePosition).toHaveText("1 - 0 of 0");
      await expect(coloc.rows).toHaveCount(0);
      await coloc.table.expectHeaders(GWASColocSection.headers);
      await coloc.table.expectFirstPage(true);

      await coloc.clearSearch();
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await coloc.table.expectRowTexts(firstPage);
      await coloc.table.expectFirstPage();
    });

    test("searching while on a later page goes back to the first page", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      await coloc.pageTo(coloc.table.nextPageButton, 1);
      await expect(coloc.table.pagePosition).toHaveText(/^11 - 20 of \d+$/);

      await searchFor(coloc, credibleSetId, "Verma");
      await expect(coloc.table.pagePosition).toHaveText(/^1 - 10 of \d+$/);
      await coloc.table.expectFirstPage();
    });
  });

  test.describe("sorting", () => {
    for (const sortable of GWASColocSection.sortable) {
      test(`${sortable.header} is sorted by the server and the rows follow it`, async ({
        page,
        testConfig,
      }) => {
        const credibleSetId = credibleSets(testConfig).primary;
        const coloc = await open(page, credibleSetId);
        const total = await coloc.total();
        const byDefault = await coloc.table.rowTexts();
        const isDefault = sortable.key === defaultSort.key;
        await expect(coloc.sortIcon(sortable.header)).toHaveCount(1);

        const first = await coloc.clickSort(sortable.header, sortable.key);
        expect(first).toHaveLength(1);
        const direction = first[0].direction;
        if (isDefault)
          expect(direction, "the default order is reversed").toBe(opposite(defaultSort.direction));
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
      for (const name of GWASColocSection.notSortable) {
        await expect(coloc.sortIcon(name), `${name} has no sort arrow`).toHaveCount(0);
      }
      await coloc.table.clickHeader("Reported trait");
      await coloc.table.clickHeader("First author");
      await expect(coloc.rows).toHaveCount(PAGE_SIZE);
      await coloc.table.expectRowTexts(byDefault);
    });

    test("a third click on a column clears the sort, and the order is sent as empty", async ({
      page,
      testConfig,
    }) => {
      const coloc = await open(page, credibleSets(testConfig).primary);
      const total = await coloc.total();
      await coloc.clickSort("P-Value", "P_VALUE");
      await coloc.clickSort("P-Value", "P_VALUE");
      expect(await coloc.clickSort("P-Value", null)).toEqual([]);
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await expect(coloc.rows).toHaveCount(PAGE_SIZE);
    });

    test("the order is global: page 2 continues where page 1 of the sorted list ends", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
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

    test("search and sort work together: the matches are sorted, on every page", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await searchFor(coloc, credibleSetId, "prostate");
      const before = await coloc.table.rowTexts();

      const sort = await coloc.clickSort("P-Value", "P_VALUE");
      await coloc.table.expectRowsChangedFrom(before);
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await coloc.expectColumnOrdered(column.pValue, "pValue", sort[0].direction);
      for (const trait of await coloc.columnTexts(column.trait)) {
        expect(trait.toLowerCase()).toContain("prostate");
      }

      const requested = await coloc.pageTo(coloc.table.nextPageButton, 1);
      expect(requested.sort).toEqual(sort);
      expect(requested.search).toEqual({ text: "prostate", fields: searchFields });
      await coloc.expectColumnOrdered(column.pValue, "pValue", sort[0].direction);
    });
  });

  test("the Columns control hides and shows columns, but not the credible set link", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const list = await coloc.table.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(GWASColocSection.headers.length);
    await expect(
      list.getByRole("checkbox", { name: "Credible set" }),
      "the credible set column cannot be hidden"
    ).toBeDisabled();

    await test.step("unchecking Reported trait removes the column", async () => {
      await list.getByRole("checkbox", { name: "Reported trait" }).uncheck();
      await expect(coloc.headers).toHaveCount(GWASColocSection.headers.length - 1);
      await expect(coloc.headers.filter({ hasText: "Reported trait" })).toHaveCount(0);
      await expect(coloc.rows.first().locator("td")).toHaveCount(
        GWASColocSection.headers.length - 1
      );
    });

    await test.step("checking it again brings it back in place", async () => {
      await list.getByRole("checkbox", { name: "Reported trait" }).check();
      await expect(coloc.headers).toHaveText(GWASColocSection.headers);
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
        expect(
          isOrdered(
            rows.map((row) => row.h4 as number),
            "DESCENDING"
          )
        ).toBe(true);
        expect(Object.keys(rows[0])).toEqual([
          "credibleSet",
          "study",
          "reportedTrait",
          "firstAuthor",
          "leadVariant",
          "pValue",
          "colocalisingVariantsN",
          "directionality",
          "h3",
          "h4",
          "clpp",
        ]);
        expect(rows[0].pValue).toMatch(/^\d(\.\d+)?x10-?\d+$/);
        expect(typeof rows[0].h4).toBe("number");
      });

      await test.step("TSV has a header line and one line per row", async () => {
        const { filename, text } = await coloc.table.download("TSV");
        expect(filename).toBe(`${credibleSetId}-credibleSets.tsv`);
        const lines = text.trimEnd().split("\n");
        expect(lines).toHaveLength(total + 1);
        expect(lines[0].split("\t")).toContain("h4");
        expect(lines[1].split("\t")).toContain(firstPageStudies[0]);
      });
    });

    test("with a search and a sort active the file holds the matching rows in that order", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const coloc = await open(page, credibleSetId);
      const total = await searchFor(coloc, credibleSetId, "prostate");
      const sort = await coloc.clickSort(
        "Colocalising Variants (n)",
        "NUMBER_COLOCALISING_VARIANTS"
      );
      await coloc.expectColumnOrdered(column.variants, "number", sort[0].direction);

      const { text } = await coloc.table.download("Json");
      const rows = JSON.parse(text) as { reportedTrait: string; colocalisingVariantsN: number }[];
      expect(rows, "one exported row per match").toHaveLength(total);
      for (const row of rows) expect(row.reportedTrait.toLowerCase()).toContain("prostate");
      expect(
        isOrdered(
          rows.map((row) => Number(row.colocalisingVariantsN)),
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

    await searchFor(coloc, credibleSetId, "Verma");
    await coloc.clickSort("P-Value", "P_VALUE");
    await coloc.expectApiQuery(['"key": "P_VALUE"', '"text": "Verma"', '"TRAIT_FROM_SOURCE"']);
  });

  test("the credible set link opens the colocalising credible set", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const href = await coloc.credibleSetLink(0).getAttribute("href");
    await coloc.credibleSetLink(0).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(new CredibleSetPage(page).title).toHaveText("Credible set");
    await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
  });

  test("the study link opens that study's page", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const studyId = (await coloc.studyLink(0).innerText()).trim();
    await coloc.studyLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/study/${studyId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(studyId);
  });

  test("the lead variant link opens that variant's page", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const href = (await coloc.leadVariantLink(0).getAttribute("href")) ?? "";
    const variantId = href.replace("/variant/", "");
    await coloc.leadVariantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    const variantPage = new VariantPage(page);
    await variantPage.waitForVariantPageLoad();
    await expect(variantPage.title).toContainText(variantId.split("_")[1]);
  });

  test("a credible set with few colocalisations fits on two short pages", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).qtl);
    const total = await coloc.total();
    expect(
      total,
      "the pQTL credible set has a handful of GWAS colocalisations"
    ).toBeLessThanOrEqual(25);
    expect(total).toBeGreaterThan(PAGE_SIZE);

    await coloc.expectPosition(1, PAGE_SIZE, total);
    await coloc.table.expectFirstPage();
    await coloc.table.nextPageButton.click();
    await coloc.expectPosition(PAGE_SIZE + 1, total, total);
    await expect(coloc.rows).toHaveCount(total - PAGE_SIZE);
    await coloc.table.expectLastPage();
  });

  test("renders for the GWAS credible set and leaves out the sections the data does not support", async ({
    page,
    testConfig,
  }) => {
    const { primary, qtl } = credibleSets(testConfig);
    await new CredibleSetPage(page).goToCredibleSetPage(primary);
    await expectSections(page, expectedSectionsFor(primary));
    await expect(
      sectionLocator(page, "credibleSetGenomicRegion"),
      "the genomic region section is switched off in the credible set profile"
    ).toHaveCount(0);

    await new CredibleSetPage(page).goToCredibleSetPage(qtl);
    await expectSections(page, expectedSectionsFor(qtl));
    await expect(sectionLocator(page, GWASColocSection.id)).toBeVisible();
  });
});
