import { type Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import type { TestConfig } from "../../../../types";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { CredibleSetVariantsSection } from "../../../../POM/objects/widgets/CredibleSet/variantsSection";
import { isOrdered, opposite } from "../../../../POM/objects/widgets/CredibleSet/serverTableSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { VariantPage } from "../../../../POM/page/variant/variant";
import { expectSectionLoaded, expectSections } from "../../../../utils/sections";

const PAGE_SIZE = 10;
const { column, defaultSort, operation, searchFields } = CredibleSetVariantsSection;

// GWAS credible set of GCST90475211 (18 variants, two pages of ten) and the pQTL credible
// set of UKB_PPP_EUR_LPA_P08519_OID30747_v1 (21 variants, so three pages of ten).
const GWAS_LEAD = "2_85545938_A_G";
const QTL_LEAD = "6_160329611_C_T";

/** The two credible sets these tests use; fails loudly if the test config lacks one. */
function credibleSets(config: TestConfig): { primary: string; qtl: string } {
  const { primary, qtl } = config.credibleSet ?? {};
  if (!primary || !qtl) throw new Error("the test config needs credibleSet.primary and credibleSet.qtl");
  return { primary, qtl };
}

async function open(page: Page, credibleSetId: string): Promise<CredibleSetVariantsSection> {
  await new CredibleSetPage(page).goToCredibleSetPage(credibleSetId);
  await expectSectionLoaded(page, CredibleSetVariantsSection.id);
  const section = new CredibleSetVariantsSection(page);
  await expect(section.rows.first()).toBeVisible();
  await section.expectSettled();
  return section;
}

/**
 * Search for a term, check the query it sends, and return how many variants match once the
 * table has shown them (the footer count and the rows arrive together).
 */
async function searchFor(
  variants: CredibleSetVariantsSection,
  credibleSetId: string,
  term: string
): Promise<number> {
  const before = await variants.total();
  const variables = await variants.search(term);
  expect(variables, "a search asks the server for the first page, keeping the sort").toEqual({
    credibleSetId,
    index: 0,
    size: PAGE_SIZE,
    sort: [defaultSort],
    search: { text: term, fields: searchFields },
  });
  await expect.poll(() => variants.total(), { message: "the footer should count the matches" }).not.toBe(before);
  const total = await variants.total();
  await expect(variants.rows).toHaveCount(Math.min(total, PAGE_SIZE));
  return total;
}

test.describe("Credible set page: Variants", () => {
  test("shows title, description, the column headers and the table controls", async ({ page, testConfig }) => {
    const variants = await open(page, credibleSets(testConfig).primary);

    await test.step("title and description", async () => {
      await expect(
        page.getByTestId("section-variants-header"),
        "the section is titled Credible Set Variants"
      ).toHaveText("Credible Set Variants");
      await expect(variants.description).toHaveText(
        "Set of variants with 95% probability of containing the causal variant. Source: Open Targets"
      );
      await expect(variants.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/credible-set#credible-set-variants"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(variants.headers).toHaveText(CredibleSetVariantsSection.headers);
    });

    await test.step("the toolbar offers search, columns, export and the API query", async () => {
      await expect(variants.table.searchInput).toHaveAttribute(
        "placeholder",
        CredibleSetVariantsSection.searchPlaceholder
      );
      await expect(variants.table.columnsButton).toBeVisible();
      await expect(variants.table.exportButton).toBeVisible();
      await expect(variants.table.apiQueryButton).toBeVisible();
    });

    await test.step("column header tooltips explain the statistics", async () => {
      const tooltips: Record<string, string> = {
        Beta: "Beta with respect to the ALT allele, as reported by the source",
        "Standard error":
          "Standard Error: Estimate of the standard deviation of the sampling distribution of the beta",
        "LD (r²)": "Linkage disequilibrium with the lead variant",
        "Posterior Probability":
          "Posterior inclusion probability that this variant is causal within the fine-mapped credible set",
        "log(BF)":
          "Natural logarithm of the Bayes Factor indicating relative likelihood of the variant being causal",
        "Predicted consequence": "Most severe consequence of the variant. Source: Ensembl VEP",
      };
      for (const [name, text] of Object.entries(tooltips)) {
        await variants.headers.filter({ hasText: name }).locator("sup").hover();
        await expect(page.getByRole("tooltip")).toHaveText(text);
        await page.mouse.move(0, 0);
        await expect(page.getByRole("tooltip")).toHaveCount(0);
      }
    });
  });

  test("opens on the first page of variants, highest posterior probability first", async ({
    page,
    testConfig,
    graphqlMonitor,
  }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const variants = await open(page, credibleSetId);
    await graphqlMonitor.settle();

    await test.step("the first query asks for ten rows sorted by posterior probability, with no search", async () => {
      const [first] = graphqlMonitor.named(operation);
      expect(first.variables).toEqual({ credibleSetId, index: 0, size: PAGE_SIZE, sort: [defaultSort] });
      expect(first.errors).toEqual([]);
    });

    await test.step("the rows run from the most probable down, and the header says so", async () => {
      await variants.expectColumnOrdered(column.posterior, "number", "DESCENDING");
      await expect(variants.table.header(/^Posterior Probability/).locator("svg[data-icon='arrow-down']")).toHaveCount(
        1
      );
    });
  });

  test("lists the variants of the credible set with real values in every column", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, credibleSets(testConfig).primary);
    await expect(variants.rows).toHaveCount(PAGE_SIZE);
    const total = await variants.total();
    expect(total, "the credible set has more variants than fit on one page").toBeGreaterThan(PAGE_SIZE);
    await variants.expectPosition(1, PAGE_SIZE, total);

    await test.step("variant column: id links to the variant page, once each", async () => {
      const ids = await variants.variantIds();
      for (const [index, id] of ids.entries()) {
        expect(id).toMatch(/^[0-9XYM]+_\d+_[ACGT]+_[ACGT]+$/);
        await expect(variants.variantLink(index)).toHaveAttribute("href", `/variant/${id}`);
      }
      expect(new Set(ids).size, "no variant is listed twice").toBe(PAGE_SIZE);
    });

    await test.step("numeric columns hold numbers in their formats", async () => {
      for (const text of await variants.columnTexts(column.pValue)) {
        expect(text, "p-value in scientific notation").toMatch(/^\d\.\d{2}×10\s*-\d+$/);
      }
      for (const index of [column.beta, column.standardError, column.logBf]) {
        for (const text of await variants.columnTexts(index)) {
          expect(Number.isFinite(Number(text)), `"${text}" is a number`).toBe(true);
        }
      }
      for (const text of await variants.columnTexts(column.standardError)) {
        expect(text, "standard error has three decimals").toMatch(/^\d+\.\d{3}$/);
      }
      for (const text of await variants.columnTexts(column.ld)) {
        // LD is not available for every credible set: either a number from 0 to 1 or N/A
        expect(text === "N/A" || (Number(text) >= 0 && Number(text) <= 1), `LD "${text}"`).toBe(true);
      }
    });

    await test.step("posterior probabilities are probabilities, highest first", async () => {
      const posteriors = (await variants.columnTexts(column.posterior)).map(Number);
      for (const value of posteriors) {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      expect(isOrdered(posteriors, "DESCENDING")).toBe(true);
    });

    await test.step("predicted consequence links to the Sequence Ontology term", async () => {
      for (let index = 0; index < PAGE_SIZE; index += 1) {
        const link = variants.consequenceLink(index);
        await expect(link).toHaveAttribute("href", /^https:\/\/identifiers\.org\/SO:\d{7}$/);
        await expect(link, "underscores are shown as spaces").toHaveText(/^[a-z0-9 ]+$/i);
        await expect(link).not.toContainText("_");
      }
    });
  });

  test("marks the lead variant, which comes first in the GWAS credible set", async ({ page, testConfig }) => {
    const variants = await open(page, credibleSets(testConfig).primary);
    await expect(variants.leadChips, "exactly one variant is the lead").toHaveCount(1);
    await expect(variants.row(0).getByText("lead", { exact: true })).toBeVisible();
    await expect(variants.variantLink(0)).toHaveText(GWAS_LEAD);
    await expect(variants.variantLink(0)).toHaveAttribute("href", `/variant/${GWAS_LEAD}`);
  });

  test("the lead variant of the pQTL credible set is the most probable one", async ({ page, testConfig }) => {
    const variants = await open(page, credibleSets(testConfig).qtl);
    await expect(variants.leadChips).toHaveCount(1);
    await expect(variants.row(0).getByText("lead", { exact: true })).toBeVisible();
    await expect(variants.variantLink(0)).toHaveText(QTL_LEAD);
    const posteriors = (await variants.columnTexts(column.posterior)).map(Number);
    expect(posteriors[0], "the lead variant carries the highest probability").toBeGreaterThan(0.5);
  });

  test("shows the variants of a credible set with a different lead, and its rare indels", async ({
    page,
    testConfig,
  }) => {
    const variants = await open(page, credibleSets(testConfig).qtl);
    const total = await variants.total();
    expect(total).toBe(21);
    await variants.expectPosition(1, PAGE_SIZE, 21);
    expect((await variants.variantIds())[0]).toBe(QTL_LEAD);

    await test.step("a variant with a long allele links to its full id", async () => {
      const longAllele = "6_160311014_GTTTTGTGACAGAGTCTTGCT_G";
      const link = page.locator(`a[href="/variant/${longAllele}"]`);
      await expect(link).toHaveCount(1);
      await expect(link, "the long allele is not spelled out in the cell").not.toHaveText(longAllele);
      await expect(link).toContainText("6_160311014");
    });
  });

  test.describe("pagination and page size", () => {
    test("paging asks the server for each page and disables the buttons at the ends", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).qtl;
      const variants = await open(page, credibleSetId);
      await variants.expectPosition(1, 10, 21);
      await variants.table.expectFirstPage();
      const first = await variants.table.rowTexts();

      const second = await test.step("next asks for page 2 and keeps the sort", async () => {
        const requested = await variants.pageTo(variants.table.nextPageButton, 1);
        expect(requested).toEqual({ credibleSetId, index: 1, size: PAGE_SIZE, sort: [defaultSort] });
        await variants.expectPosition(11, 20, 21);
        await expect(variants.rows).toHaveCount(10);
        await variants.table.expectRowsChangedFrom(first);
        await expect(variants.leadChips, "the lead variant is only on the first page").toHaveCount(0);
        await expect(variants.table.firstPageButton).toBeEnabled();
        await expect(variants.table.previousPageButton).toBeEnabled();
        return variants.table.rowTexts();
      });

      await test.step("last asks for page 3, which holds the remaining variant", async () => {
        const requested = await variants.pageTo(variants.table.lastPageButton, 2);
        expect(requested.sort).toEqual([defaultSort]);
        await variants.expectPosition(21, 21, 21);
        await expect(variants.rows).toHaveCount(1);
        await variants.table.expectLastPage();
      });

      await test.step("previous returns to exactly page 2, and first to exactly page 1", async () => {
        await variants.table.previousPageButton.click();
        await variants.expectPosition(11, 20, 21);
        await variants.table.expectRowTexts(second);
        await variants.table.firstPageButton.click();
        await variants.expectPosition(1, 10, 21);
        await variants.table.expectRowTexts(first);
        await variants.table.expectFirstPage();
      });
    });

    test("page size asks for that many rows, and every variant adds up to a 95% credible set", async ({
      page,
      testConfig,
    }) => {
      const variants = await open(page, credibleSets(testConfig).primary);
      const total = await variants.total();
      await expect(variants.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
      await variants.pageTo(variants.table.nextPageButton, 1);

      const requested = await variants.resize(25);
      expect(requested).toMatchObject({ index: 0, size: 25, sort: [defaultSort] });
      await expect(variants.rows).toHaveCount(total);
      await variants.expectPosition(1, total, total);
      await variants.table.expectFirstPage(true);

      const posteriors = (await variants.columnTexts(column.posterior)).map(Number);
      const sum = posteriors.reduce((a, b) => a + b, 0);
      expect(sum, "a 95% credible set sums to at least 0.95").toBeGreaterThanOrEqual(0.95);
      expect(sum, "probabilities cannot exceed 1").toBeLessThanOrEqual(1.001);
      expect(isOrdered(posteriors, "DESCENDING")).toBe(true);
    });
  });

  test.describe("search", () => {
    test("the search box asks the server to look in the variant id and the consequence", async ({
      page,
      testConfig,
    }) => {
      const variants = await open(page, credibleSets(testConfig).primary);
      const variables = await variants.search("intron");
      expect(variables.search).toEqual({ text: "intron", fields: searchFields });
    });

    test("by variant id leaves that variant", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const variants = await open(page, credibleSetId);

      const total = await searchFor(variants, credibleSetId, GWAS_LEAD);
      expect(total).toBe(1);
      await variants.expectPosition(1, 1, 1);
      await expect(variants.variantLink(0)).toHaveText(GWAS_LEAD);
      await expect(variants.leadChips).toHaveCount(1);
      await variants.table.expectFirstPage(true);
    });

    test("by consequence keeps only variants with that consequence", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const variants = await open(page, credibleSetId);
      const all = await variants.total();

      const total = await searchFor(variants, credibleSetId, "intron");
      expect(total).toBeGreaterThan(1);
      expect(total).toBeLessThan(all);
      for (let index = 0; index < total; index += 1) {
        await expect(variants.consequenceLink(index)).toContainText("intron");
      }
    });

    test("a term nothing matches leaves an empty table, and clearing it restores the list", async ({
      page,
      testConfig,
    }) => {
      const variants = await open(page, credibleSets(testConfig).primary);
      const total = await variants.total();
      const firstPage = await variants.table.rowTexts();

      await variants.search("zzz-no-variant-matches-this");
      await expect(variants.table.pagePosition).toHaveText("1 - 0 of 0");
      await expect(variants.rows).toHaveCount(0);
      await variants.table.expectHeaders(CredibleSetVariantsSection.headers);
      await variants.table.expectFirstPage(true);

      await variants.clearSearch();
      await variants.expectPosition(1, PAGE_SIZE, total);
      await variants.table.expectRowTexts(firstPage);
      await variants.table.expectFirstPage();
    });

    test("searching while on a later page goes back to the first page", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).qtl;
      const variants = await open(page, credibleSetId);
      await variants.pageTo(variants.table.nextPageButton, 1);
      await variants.expectPosition(11, 20, 21);

      const total = await searchFor(variants, credibleSetId, QTL_LEAD);
      expect(total).toBe(1);
      await variants.expectPosition(1, 1, 1);
      await expect(variants.variantLink(0)).toHaveText(QTL_LEAD);
    });
  });

  test.describe("sorting", () => {
    for (const sortable of CredibleSetVariantsSection.sortable) {
      test(`${sortable.header} is sorted by the server${
        sortable.kind === "unreadable" ? "" : " and the rows follow it"
      }`, async ({ page, testConfig }) => {
        const credibleSetId = credibleSets(testConfig).primary;
        const variants = await open(page, credibleSetId);
        const total = await variants.total();
        const byDefault = await variants.table.rowTexts();
        const isDefault = sortable.key === defaultSort.key;
        const readable = sortable.kind !== "unreadable";
        await expect(variants.sortIcon(sortable.header)).toHaveCount(1);

        const first = await variants.clickSort(sortable.header, sortable.key);
        expect(first).toHaveLength(1);
        const direction = first[0].direction;
        if (isDefault) expect(direction, "the default order is reversed").toBe(opposite(defaultSort.direction));
        await variants.expectPosition(1, PAGE_SIZE, total);
        if (readable) {
          // log(BF) ranks the variants like the default posterior probability does, so its
          // first click, which runs the same way, shows the same rows
          if (sortable.key !== "LOG_BAYES_FACTOR") await variants.table.expectRowsChangedFrom(byDefault);
          await variants.expectColumnOrdered(sortable.column, sortable.kind, direction);
        }
        const firstSorted = await variants.table.rowTexts();

        if (isDefault) {
          // the column already sorted the table: the second click clears the sort
          expect(await variants.clickSort(sortable.header, null)).toEqual([]);
          return;
        }
        const second = await variants.clickSort(sortable.header, sortable.key);
        expect(second[0].direction, "a second click reverses the order").toBe(opposite(direction));
        await variants.expectPosition(1, PAGE_SIZE, total);
        if (readable) {
          await variants.table.expectRowsChangedFrom(firstSorted);
          await variants.expectColumnOrdered(sortable.column, sortable.kind, opposite(direction));
        }
      });
    }

    test("Predicted consequence has no sort control and clicking it leaves the table as it was", async ({
      page,
      testConfig,
    }) => {
      const variants = await open(page, credibleSets(testConfig).primary);
      const byDefault = await variants.table.rowTexts();
      for (const name of CredibleSetVariantsSection.notSortable) {
        await expect(variants.sortIcon(name), `${name} has no sort arrow`).toHaveCount(0);
      }
      await variants.table.clickHeader(/^Predicted consequence/);
      await expect(variants.rows).toHaveCount(PAGE_SIZE);
      await variants.table.expectRowTexts(byDefault);
    });

    test("the order is global: page 2 continues where page 1 of the sorted list ends", async ({
      page,
      testConfig,
    }) => {
      const variants = await open(page, credibleSets(testConfig).qtl);
      const byDefault = await variants.table.rowTexts();
      const sort = await variants.clickSort("Variant", "VARIANT");
      expect(sort[0].direction).toBe("ASCENDING");
      await variants.table.expectRowsChangedFrom(byDefault);
      await variants.expectColumnOrdered(column.variant, "text", "ASCENDING");
      const page1 = await variants.variantIds();
      const page1Rows = await variants.table.rowTexts();

      const requested = await variants.pageTo(variants.table.nextPageButton, 1);
      expect(requested.sort).toEqual(sort);
      await variants.expectPosition(11, 20, 21);
      await variants.table.expectRowsChangedFrom(page1Rows);
      await variants.expectColumnOrdered(column.variant, "text", "ASCENDING");
      const page2 = await variants.variantIds();
      expect(page2[0] >= page1[page1.length - 1], "page 2 starts at or after where page 1 ended").toBe(true);
    });

    test("search and sort work together: the matches are sorted", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const variants = await open(page, credibleSetId);
      const total = await searchFor(variants, credibleSetId, "intron");
      const before = await variants.table.rowTexts();

      const sort = await variants.clickSort("Beta", "REPORTED_BETA");
      await variants.table.expectRowsChangedFrom(before);
      await variants.expectPosition(1, Math.min(total, PAGE_SIZE), total);
      await variants.expectColumnOrdered(column.beta, "number", sort[0].direction);
      for (let index = 0; index < Math.min(total, PAGE_SIZE); index += 1) {
        await expect(variants.consequenceLink(index)).toContainText("intron");
      }
    });
  });

  test("the Columns button hides and restores a column", async ({ page, testConfig }) => {
    const variants = await open(page, credibleSets(testConfig).primary);
    const list = await variants.table.openColumnPicker();

    await test.step("every column is listed; the variant column cannot be hidden", async () => {
      await expect(list.getByRole("checkbox")).toHaveCount(CredibleSetVariantsSection.headers.length);
      await expect(list.getByRole("checkbox", { name: "Variant" })).toBeDisabled();
      await expect(list.getByRole("checkbox", { name: "Beta" })).toBeChecked();
    });

    await test.step("unchecking Beta removes its header and cells", async () => {
      await list.getByRole("checkbox", { name: "Beta" }).uncheck();
      await expect(variants.headers).toHaveText(
        CredibleSetVariantsSection.headers.filter((header) => header !== "Beta?")
      );
      await expect(variants.rows.first().locator("td")).toHaveCount(
        CredibleSetVariantsSection.headers.length - 1
      );
    });

    await test.step("checking it again brings it back", async () => {
      await list.getByRole("checkbox", { name: "Beta" }).check();
      await expect(variants.headers).toHaveText(CredibleSetVariantsSection.headers);
    });
  });

  test.describe("export", () => {
    test("downloads every variant as JSON and TSV", async ({ page, testConfig }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const variants = await open(page, credibleSetId);
      const total = await variants.total();
      const firstPageIds = await variants.variantIds();

      await test.step("JSON holds all variants, not just the page on screen", async () => {
        const { filename, text } = await variants.table.download("Json");
        expect(filename).toBe(`${credibleSetId}-credibleset.json`);
        const rows = JSON.parse(text) as Record<string, unknown>[];
        expect(rows).toHaveLength(total);
        expect(rows.slice(0, PAGE_SIZE).map((row) => row.variant)).toEqual(firstPageIds);
        expect(Object.keys(rows[0])).toEqual([
          "variant",
          "pValue",
          "beta",
          "standardError",
          "ldR",
          "posteriorProbability",
          "logBf",
          "predictedConsequence",
        ]);
        expect(rows[0].pValue).toMatch(/^\d(\.\d+)?x10-\d+$/);
        expect(typeof rows[0].posteriorProbability).toBe("number");
      });

      await test.step("TSV has a header line and one line per variant", async () => {
        const { filename, text } = await variants.table.download("TSV");
        expect(filename).toBe(`${credibleSetId}-credibleset.tsv`);
        const lines = text.trimEnd().split("\n");
        expect(lines[0].split("\t")).toContain("posteriorProbability");
        expect(lines).toHaveLength(total + 1);
        expect(lines[1].split("\t")[0]).toBe(firstPageIds[0]);
      });
    });

    test("with a search and a sort active the file holds the matching variants in that order", async ({
      page,
      testConfig,
    }) => {
      const credibleSetId = credibleSets(testConfig).primary;
      const variants = await open(page, credibleSetId);
      const total = await searchFor(variants, credibleSetId, "intron");
      const sort = await variants.clickSort("Beta", "REPORTED_BETA");
      await variants.expectColumnOrdered(column.beta, "number", sort[0].direction);

      const { text } = await variants.table.download("Json");
      const rows = JSON.parse(text) as { predictedConsequence: string; beta: number }[];
      expect(rows, "one exported row per match").toHaveLength(total);
      for (const row of rows) expect(row.predictedConsequence).toContain("intron");
      expect(
        isOrdered(
          rows.map((row) => Number(row.beta)),
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
    const variants = await open(page, credibleSetId);
    await variants.expectApiQuery(['"key": "POSTERIOR_PROBABILITY"', '"direction": "DESCENDING"']);

    await searchFor(variants, credibleSetId, "intron");
    await variants.clickSort("Beta", "REPORTED_BETA");
    await variants.expectApiQuery(['"key": "REPORTED_BETA"', '"text": "intron"', '"VARIANT_ID"']);
  });

  test("a variant link opens that variant's page", async ({ page, testConfig }) => {
    const variants = await open(page, credibleSets(testConfig).primary);
    await variants.variantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${GWAS_LEAD}$`));
    const variantPage = new VariantPage(page);
    await variantPage.waitForVariantPageLoad();
    await expect(variantPage.title).toContainText(GWAS_LEAD);
  });

  test("a consequence link points at the ontology term", async ({ page, testConfig }) => {
    const variants = await open(page, credibleSets(testConfig).primary);
    // The lead variant of this set is in a 3' UTR
    await expect(variants.consequenceLink(0)).toHaveText("3 prime UTR variant");
    await expect(variants.consequenceLink(0)).toHaveAttribute("href", "https://identifiers.org/SO:0001624");
  });

  test("renders exactly the sections the credible sets are known to have", async ({ page, testConfig }) => {
    const { qtl } = credibleSets(testConfig);
    await new CredibleSetPage(page).goToCredibleSetPage(qtl);
    await expectSections(page, expectedSectionsFor(qtl));
    await expect(page.getByTestId("section-variants")).toBeVisible();
  });
});
