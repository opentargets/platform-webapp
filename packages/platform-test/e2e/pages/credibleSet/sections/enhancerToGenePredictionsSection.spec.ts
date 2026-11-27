import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { CredibleSetEnhancerToGenePredictionsSection } from "../../../../POM/objects/widgets/CredibleSet/enhancerToGenePredictionsSection";
import {
  isOrdered,
  opposite,
} from "../../../../POM/objects/widgets/CredibleSet/serverTableSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import type { TestConfig } from "../../../../types";
import { expectSectionLoaded, expectSections } from "../../../../utils/sections";

const { column, defaultSort, operation, searchFields } =
  CredibleSetEnhancerToGenePredictionsSection;
const PAGE_SIZE = 10;
const NUMBER = /^\d{1,3}(,\d{3})*$/;
const RANGE = /^chr(\d+|X|Y|MT)?:?\d*:?[\d,]*-?[\d,]*$/;

// GWAS credible set of GCST90475211: lead variant 2_85545938_A_G, 16 enhancer-gene
// predictions (two pages). pQTL credible set of UKB_PPP_EUR_LPA_P08519_OID30747_v1:
// lead variant 6_160329611_C_T, 5 predictions (one page).
const GWAS_LEAD = "2_85545938_A_G";
const QTL_LEAD = "6_160329611_C_T";

/** The credible sets these tests use; fails loudly if the test config lacks one. */
function credibleSets(config: TestConfig): { primary: string; qtl: string } {
  const { primary, qtl } = config.credibleSet ?? {};
  if (!primary || !qtl)
    throw new Error("the test config needs credibleSet.primary and credibleSet.qtl");
  return { primary, qtl };
}

async function open(
  page: Page,
  credibleSetId: string
): Promise<CredibleSetEnhancerToGenePredictionsSection> {
  await new CredibleSetPage(page).goToCredibleSetPage(credibleSetId);
  await expectSectionLoaded(page, CredibleSetEnhancerToGenePredictionsSection.id);
  const e2g = new CredibleSetEnhancerToGenePredictionsSection(page);
  await expect(e2g.rows.first()).toBeVisible();
  await e2g.expectSettled();
  return e2g;
}

/** "chr2:85,545,132-85,547,881" as numbers. */
function parseRange(text: string): { chromosome: string; start: number; end: number } {
  const match = /^(chr\w+):([\d,]+)-([\d,]+)$/.exec(text.trim());
  if (!match) throw new Error(`"${text}" is not a chromosome:start-end range`);
  return {
    chromosome: match[1],
    start: Number(match[2].replaceAll(",", "")),
    end: Number(match[3].replaceAll(",", "")),
  };
}

function toNumber(text: string): number {
  return Number(text.trim().replaceAll(",", ""));
}

/**
 * Search for a term, check the query it sends, and return how many predictions match once
 * the table has shown them (the footer count and the rows arrive together).
 */
async function searchFor(
  e2g: CredibleSetEnhancerToGenePredictionsSection,
  credibleSetId: string,
  term: string
): Promise<number> {
  const before = await e2g.total();
  const variables = await e2g.search(term);
  expect(variables, "a search asks the server for the first page, keeping the sort").toEqual({
    credibleSetId,
    index: 0,
    size: PAGE_SIZE,
    sort: [defaultSort],
    search: { text: term, fields: searchFields },
  });
  await expect
    .poll(() => e2g.total(), { message: "the footer should count the matches" })
    .not.toBe(before);
  const total = await e2g.total();
  await expect(e2g.rows).toHaveCount(Math.min(total, PAGE_SIZE));
  return total;
}

test.describe("Credible set page: enhancer-to-gene predictions", () => {
  test("shows title, description naming the lead variant, and the column headers", async ({
    page,
    testConfig,
  }) => {
    const e2g = await open(page, credibleSets(testConfig).primary);

    await test.step("title and description", async () => {
      await expect(page.getByTestId("section-enhancer-to-gene-predictions-header")).toHaveText(
        "Enhancer-to-gene predictions"
      );
      await expect(e2g.description).toContainText(
        "Genes predicted to be regulated by enhancers overlapping the credible set lead variant"
      );
      await expect(e2g.description).toContainText("2_85545938_A_G");
      await expect(e2g.description.getByRole("link", { name: "ENCODE rE2G" })).toHaveAttribute(
        "href",
        "https://doi.org/10.1101/2023.11.09.563812"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(e2g.headers).toHaveText(CredibleSetEnhancerToGenePredictionsSection.headers);
    });

    await test.step("the toolbar offers search, columns, export and the API query", async () => {
      await expect(e2g.table.searchInput).toHaveAttribute(
        "placeholder",
        CredibleSetEnhancerToGenePredictionsSection.searchPlaceholder
      );
      await expect(e2g.table.columnsButton).toBeVisible();
      await expect(e2g.table.exportButton).toBeVisible();
      await expect(e2g.table.apiQueryButton).toBeVisible();
    });

    await test.step("the Score header explains the E2G score", async () => {
      await e2g.headers.filter({ hasText: "Score" }).locator("sup").hover();
      await expect(page.getByRole("tooltip")).toContainText(
        "This score (0-1) from E2G reflects the confidence that this genomic region regulates its target gene"
      );
    });
  });

  test("every row has a gene, tissue, study and consistent interval numbers", async ({
    page,
    testConfig,
  }) => {
    const e2g = await open(page, credibleSets(testConfig).primary);
    const total = await e2g.total();
    await e2g.expectPosition(1, PAGE_SIZE, total);
    await expect(e2g.rows).toHaveCount(PAGE_SIZE);

    for (let index = 0; index < PAGE_SIZE; index += 1) {
      await test.step(`row ${index + 1}`, async () => {
        await expect(e2g.geneLink(index)).toHaveAttribute("href", /^\/target\/ENSG\d{11}$/);
        await expect(e2g.geneLink(index)).toHaveText(/^[A-Za-z0-9._-]+$/);
        await expect(e2g.tissueLink(index)).toHaveAttribute(
          "href",
          /^https:\/\/www\.ebi\.ac\.uk\/ols4\/search\?q=[A-Z]+_\d+$/
        );
        await expect(e2g.tissueLink(index)).toHaveText(/\S/);
        await expect(e2g.cell(index, column.intervalType)).toHaveText(/^(genic|intergenic)$/);
        await expect(e2g.studyLink(index)).toHaveAttribute(
          "href",
          /^https:\/\/www\.encodeproject\.org\/experiments\/ENCFF[A-Z0-9]+\/$/
        );
        await expect(e2g.studyLink(index)).toHaveText(/^ENCFF[A-Z0-9]+$/);
        await expect(e2g.cell(index, column.distance)).toHaveText(NUMBER);
        await expect(e2g.cell(index, column.size)).toHaveText(NUMBER);
        await expect(e2g.cell(index, column.range)).toHaveText(RANGE);
        await expect(e2g.cell(index, column.score)).toHaveText(/^[01]\.\d{3}$/);

        const range = parseRange(await e2g.cell(index, column.range).innerText());
        expect(range.end, "the interval ends after it starts").toBeGreaterThan(range.start);
        expect(
          toNumber(await e2g.cell(index, column.size).innerText()),
          "interval size is end - start + 1"
        ).toBe(range.end - range.start + 1);
      });
    }

    await test.step("the intervals overlap the lead variant's chromosome, and scores are in [0, 1]", async () => {
      for (const text of await e2g.columnTexts(column.range)) {
        expect(parseRange(text).chromosome).toBe("chr2");
      }
      for (const text of await e2g.columnTexts(column.score)) {
        expect(Number(text)).toBeGreaterThan(0);
        expect(Number(text)).toBeLessThanOrEqual(1);
      }
    });

    await test.step("the lead variant lies within each interval (genic and enhancer overlap)", async () => {
      const position = Number(GWAS_LEAD.split("_")[1]);
      for (const text of await e2g.columnTexts(column.range)) {
        const { start, end } = parseRange(text);
        expect(position, `${GWAS_LEAD} is inside ${text}`).toBeGreaterThanOrEqual(start);
        expect(position).toBeLessThanOrEqual(end);
      }
    });
  });

  test("opens on the first page, highest score first, and the gene links go to target pages", async ({
    page,
    testConfig,
    graphqlMonitor,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const e2g = await open(page, credibleSetId);
    await graphqlMonitor.settle();

    await test.step("the first query asks for ten rows sorted by score, with no search", async () => {
      const [first] = graphqlMonitor.named(operation);
      expect(first.variables).toEqual({
        credibleSetId,
        index: 0,
        size: PAGE_SIZE,
        sort: [defaultSort],
      });
      expect(first.errors).toEqual([]);
    });

    await test.step("predictions arrive highest score first, and the Score header says so", async () => {
      await e2g.expectColumnOrdered(column.score, "number", "DESCENDING");
      await expect(e2g.table.header(/^Score/).locator("svg[data-icon='arrow-down']")).toHaveCount(
        1
      );
    });

    await test.step("GGCX is the gene this enhancer most confidently regulates", async () => {
      expect(await e2g.columnTexts(column.gene)).toContain("GGCX");
    });
  });

  test.describe("pagination and page size", () => {
    test("pages through the server: 16 predictions are 10 then 6", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const e2g = await open(page, credibleSetId);
      const total = await e2g.total();
      expect(total, "the set has more than one page and less than two").toBeGreaterThan(PAGE_SIZE);
      expect(total).toBeLessThanOrEqual(PAGE_SIZE * 2);
      const firstPage = await e2g.table.rowTexts();
      const firstScores = (await e2g.columnTexts(column.score)).map(Number);
      await e2g.table.expectFirstPage();

      await test.step("next asks for page 2, keeps the sort and shows the remainder", async () => {
        const requested = await e2g.pageTo(e2g.table.nextPageButton, 1);
        expect(requested).toEqual({
          credibleSetId,
          index: 1,
          size: PAGE_SIZE,
          sort: [defaultSort],
        });
        await e2g.expectPosition(PAGE_SIZE + 1, total, total);
        await expect(e2g.rows).toHaveCount(total - PAGE_SIZE);
        await e2g.table.expectRowsChangedFrom(firstPage);
        await e2g.table.expectLastPage();
      });

      await test.step("page 2 continues after page 1: lower scores", async () => {
        const secondScores = (await e2g.columnTexts(column.score)).map(Number);
        expect(secondScores[0]).toBeLessThanOrEqual(firstScores[firstScores.length - 1]);
        expect(isOrdered(secondScores, "DESCENDING")).toBe(true);
      });

      await test.step("previous returns to exactly the first page", async () => {
        await e2g.table.previousPageButton.click();
        await e2g.table.expectRowTexts(firstPage);
        await e2g.table.expectFirstPage();
      });

      await test.step("last goes to the second page, first back to the first", async () => {
        await e2g.table.lastPageButton.click();
        await e2g.expectPosition(PAGE_SIZE + 1, total, total);
        await e2g.table.firstPageButton.click();
        await e2g.table.expectRowTexts(firstPage);
      });
    });

    test("a page size of 25 asks for 25 rows and shows everything on one page", async ({
      page,
      testConfig,
    }) => {
      const e2g = await open(page, credibleSets(testConfig).primary);
      const total = await e2g.total();
      await expect(e2g.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
      await e2g.pageTo(e2g.table.nextPageButton, 1);

      const requested = await e2g.resize(25);
      expect(requested).toMatchObject({ index: 0, size: 25, sort: [defaultSort] });
      await e2g.expectPosition(1, total, total);
      await expect(e2g.rows).toHaveCount(total);
      await e2g.table.expectFirstPage(true);
    });
  });

  test.describe("search", () => {
    test("the search box asks the server to look in gene, tissue, interval type and study", async ({
      page,
      testConfig,
    }) => {
      const e2g = await open(page, credibleSets(testConfig).primary);
      const variables = await e2g.search("GGCX");
      expect(variables.search).toEqual({ text: "GGCX", fields: searchFields });
    });

    test("by gene symbol keeps only that gene's predictions", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const e2g = await open(page, credibleSetId);
      const all = await e2g.total();

      const total = await searchFor(e2g, credibleSetId, "GGCX");
      expect(total).toBeGreaterThan(1);
      expect(total).toBeLessThan(all);
      await e2g.expectPosition(1, total, total);
      for (const gene of await e2g.columnTexts(column.gene)) expect(gene).toBe("GGCX");
      await e2g.table.expectFirstPage(true);
    });

    test("by tissue name keeps only rows with that tissue", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const e2g = await open(page, credibleSetId);
      const all = await e2g.total();

      const total = await searchFor(e2g, credibleSetId, "HCT116");
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThan(all);
      for (const tissue of await e2g.columnTexts(column.tissue)) expect(tissue).toBe("HCT116");
    });

    test("by study id finds that experiment", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const e2g = await open(page, credibleSetId);
      const study = (await e2g.studyLink(0).innerText()).trim();

      const total = await searchFor(e2g, credibleSetId, study);
      expect(total).toBeGreaterThan(0);
      for (const found of await e2g.columnTexts(column.study)) expect(found).toBe(study);
    });

    test("a term nothing matches leaves an empty table, and clearing it restores the list", async ({
      page,
      testConfig,
    }) => {
      const e2g = await open(page, credibleSets(testConfig).primary);
      const total = await e2g.total();
      const firstPage = await e2g.table.rowTexts();

      await e2g.search("zzz-no-prediction-matches-this");
      await expect(e2g.table.pagePosition).toHaveText("1 - 0 of 0");
      await expect(e2g.rows).toHaveCount(0);
      await e2g.table.expectHeaders(CredibleSetEnhancerToGenePredictionsSection.headers);
      await e2g.table.expectFirstPage(true);

      await e2g.clearSearch();
      await e2g.expectPosition(1, PAGE_SIZE, total);
      await e2g.table.expectRowTexts(firstPage);
      await e2g.table.expectFirstPage();
    });

    test("searching while on the second page goes back to the first page", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const e2g = await open(page, credibleSetId);
      await e2g.pageTo(e2g.table.nextPageButton, 1);
      await expect(e2g.table.pagePosition).toHaveText(/^11 - 16 of 16$/);

      const total = await searchFor(e2g, credibleSetId, "GGCX");
      await e2g.expectPosition(1, total, total);
    });
  });

  test.describe("sorting", () => {
    for (const sortable of CredibleSetEnhancerToGenePredictionsSection.sortable) {
      test(`${sortable.header} is sorted by the server${
        sortable.kind === "unreadable" ? "" : " and the rows follow it"
      }`, async ({ page, testConfig }) => {
        const credibleSetId = credibleSets(testConfig).primary;
        const e2g = await open(page, credibleSetId);
        const total = await e2g.total();
        const byDefault = await e2g.table.rowTexts();
        const isDefault = sortable.key === defaultSort.key;
        const readable = sortable.kind !== "unreadable";
        await expect(e2g.sortIcon(sortable.header)).toHaveCount(1);

        const first = await e2g.clickSort(sortable.header, sortable.key);
        expect(first).toHaveLength(1);
        const direction = first[0].direction;
        if (isDefault)
          expect(direction, "the default order is reversed").toBe(opposite(defaultSort.direction));
        await e2g.expectPosition(1, PAGE_SIZE, total);
        if (readable) {
          await e2g.table.expectRowsChangedFrom(byDefault);
          await e2g.expectColumnOrdered(sortable.column, sortable.kind, direction);
        }
        const firstSorted = await e2g.table.rowTexts();

        if (isDefault) {
          // the column already sorted the table: the second click clears the sort
          expect(await e2g.clickSort(sortable.header, null)).toEqual([]);
          return;
        }
        const second = await e2g.clickSort(sortable.header, sortable.key);
        expect(second[0].direction, "a second click reverses the order").toBe(opposite(direction));
        await e2g.expectPosition(1, PAGE_SIZE, total);
        if (readable) {
          await e2g.table.expectRowsChangedFrom(firstSorted);
          await e2g.expectColumnOrdered(sortable.column, sortable.kind, opposite(direction));
        }
      });
    }

    test("columns without a sort field have no sort control and clicking them leaves the table as it was", async ({
      page,
      testConfig,
    }) => {
      const e2g = await open(page, credibleSets(testConfig).primary);
      const byDefault = await e2g.table.rowTexts();
      for (const name of CredibleSetEnhancerToGenePredictionsSection.notSortable) {
        await expect(e2g.sortIcon(name), `${name} has no sort arrow`).toHaveCount(0);
      }
      await e2g.table.clickHeader("Study");
      await e2g.table.clickHeader("Interval range");
      await expect(e2g.rows).toHaveCount(PAGE_SIZE);
      await e2g.table.expectRowTexts(byDefault);
    });

    test("the order is global: page 2 continues where page 1 of the sorted list ends", async ({
      page,
      testConfig,
    }) => {
      const e2g = await open(page, credibleSets(testConfig).primary);
      const total = await e2g.total();
      const byDefault = await e2g.table.rowTexts();
      const sort = await e2g.clickSort("Distance from start site (bp)", "DISTANCE_TO_TSS");
      await e2g.table.expectRowsChangedFrom(byDefault);
      await e2g.expectColumnOrdered(column.distance, "number", sort[0].direction);
      const page1 = (await e2g.columnTexts(column.distance)).map(toNumber);
      const page1Rows = await e2g.table.rowTexts();

      const requested = await e2g.pageTo(e2g.table.nextPageButton, 1);
      expect(requested.sort).toEqual(sort);
      await e2g.expectPosition(PAGE_SIZE + 1, total, total);
      await e2g.table.expectRowsChangedFrom(page1Rows);
      await e2g.expectColumnOrdered(column.distance, "number", sort[0].direction);
      const page2 = (await e2g.columnTexts(column.distance)).map(toNumber);
      const lastOfPage1 = page1[page1.length - 1];
      if (sort[0].direction === "DESCENDING") expect(page2[0]).toBeLessThanOrEqual(lastOfPage1);
      else expect(page2[0]).toBeGreaterThanOrEqual(lastOfPage1);
    });

    test("search and sort work together: the matches are sorted", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const e2g = await open(page, credibleSetId);
      const total = await searchFor(e2g, credibleSetId, "GGCX");
      const before = await e2g.table.rowTexts();

      const sort = await e2g.clickSort("Interval size (bp)", "INTERVAL_SIZE");
      await e2g.table.expectRowsChangedFrom(before);
      await e2g.expectPosition(1, total, total);
      await e2g.expectColumnOrdered(column.size, "number", sort[0].direction);
      for (const gene of await e2g.columnTexts(column.gene)) expect(gene).toBe("GGCX");
    });
  });

  test("the Columns control hides and shows columns", async ({ page, testConfig }) => {
    const e2g = await open(page, credibleSets(testConfig).primary);
    const headers = CredibleSetEnhancerToGenePredictionsSection.headers;
    const list = await e2g.table.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(headers.length);
    await expect(
      list.getByRole("checkbox", { name: "Gene" }),
      "the gene column cannot be hidden"
    ).toBeDisabled();
    await expect(list.getByRole("checkbox", { name: "Affected tissue/cell" })).toBeDisabled();

    await test.step("unchecking Interval type removes the column", async () => {
      await list.getByRole("checkbox", { name: "Interval type" }).uncheck();
      await expect(e2g.headers).toHaveCount(headers.length - 1);
      await expect(e2g.headers.filter({ hasText: "Interval type" })).toHaveCount(0);
      await expect(e2g.rows.first().locator("td")).toHaveCount(headers.length - 1);
    });

    await test.step("checking it again brings it back in place", async () => {
      await list.getByRole("checkbox", { name: "Interval type" }).check();
      await expect(e2g.headers).toHaveText(headers);
    });
  });

  test("Export downloads every prediction as JSON and TSV in the table's order", async ({
    page,
    testConfig,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const e2g = await open(page, credibleSetId);
    const total = await e2g.total();
    const genes = await e2g.columnTexts(column.gene);

    await test.step("JSON holds all rows with raw numbers and plain ranges", async () => {
      const { filename, text } = await e2g.table.download("Json");
      expect(filename).toBe(`${credibleSetId}-enhancer-to-gene-predictions.json`);
      const rows = JSON.parse(text) as Record<string, string>[];
      expect(rows).toHaveLength(total);
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.gene)).toEqual(genes);
      expect(
        isOrdered(
          rows.map((row) => Number(row.score)),
          "DESCENDING"
        ),
        "the file is in the table's order: highest score first"
      ).toBe(true);
      expect(Object.keys(rows[0])).toEqual([
        "gene",
        "affectedTissueCell",
        "intervalType",
        "study",
        "distanceFromStartSiteBp",
        "intervalSizeBp",
        "intervalRange",
        "score",
      ]);
      expect(rows[0].intervalRange).toMatch(/^chr\d+:\d+-\d+$/);
      expect(Number(rows[0].score)).toBeGreaterThan(0);
    });

    await test.step("TSV has a header line and one line per row", async () => {
      const { filename, text } = await e2g.table.download("TSV");
      expect(filename).toBe(`${credibleSetId}-enhancer-to-gene-predictions.tsv`);
      expect(text.trimEnd().split("\n")).toHaveLength(total + 1);
    });
  });

  test("with a search and a sort active the exported file holds the matching predictions in that order", async ({
    page,
    testConfig,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const e2g = await open(page, credibleSetId);
    const total = await searchFor(e2g, credibleSetId, "GGCX");
    const sort = await e2g.clickSort("Distance from start site (bp)", "DISTANCE_TO_TSS");
    await e2g.expectColumnOrdered(column.distance, "number", sort[0].direction);

    const { text } = await e2g.table.download("Json");
    const rows = JSON.parse(text) as { gene: string; distanceFromStartSiteBp: string }[];
    expect(rows, "one exported row per match").toHaveLength(total);
    for (const row of rows) expect(row.gene).toBe("GGCX");
    expect(
      isOrdered(
        rows.map((row) => Number(row.distanceFromStartSiteBp)),
        sort[0].direction
      ),
      "the file follows the table's sort"
    ).toBe(true);
  });

  test("the API query drawer holds the table query and the variables of the search and sort", async ({
    page,
    testConfig,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const e2g = await open(page, credibleSetId);
    await e2g.expectApiQuery(['"key": "SCORE"', '"direction": "DESCENDING"']);

    await searchFor(e2g, credibleSetId, "GGCX");
    await e2g.clickSort("Distance from start site (bp)", "DISTANCE_TO_TSS");
    await e2g.expectApiQuery(['"key": "DISTANCE_TO_TSS"', '"text": "GGCX"', '"BIOSAMPLE_ID"']);
  });

  test("a gene link opens that gene's target page", async ({ page, testConfig }) => {
    const e2g = await open(page, credibleSets(testConfig).primary);
    const symbol = (await e2g.geneLink(0).innerText()).trim();
    const href = (await e2g.geneLink(0).getAttribute("href")) ?? "";
    await e2g.geneLink(0).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(symbol);
  });

  test("a credible set with five predictions fits on one page", async ({ page, testConfig }) => {
    const e2g = await open(page, credibleSets(testConfig).qtl);
    const total = await e2g.total();
    expect(total).toBeLessThan(PAGE_SIZE);
    await e2g.expectPosition(1, total, total);
    await expect(e2g.rows).toHaveCount(total);
    await e2g.table.expectFirstPage(true);
    await expect(e2g.description).toContainText(QTL_LEAD);
  });

  test("renders on both credible sets, as the manifest says", async ({ page, testConfig }) => {
    for (const id of Object.values(credibleSets(testConfig))) {
      await new CredibleSetPage(page).goToCredibleSetPage(id);
      await expectSections(page, expectedSectionsFor(id));
    }
  });
});
