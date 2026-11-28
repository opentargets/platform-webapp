import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  GWAS_HEADERS,
  GWASCredibleSetsSection,
} from "../../../POM/objects/widgets/shared/GWASCredibleSetsSection";
import {
  directionOf,
  numbersOf,
  pValueLog10,
} from "../../../POM/objects/widgets/shared/variantCredibleSetsTable";
import { VariantPage } from "../../../POM/page/variant/variant";
import { expectSectionLoaded, expectSections, sectionLocator } from "../../../utils/sections";

const PAGE_SIZE = 10;
/** APOE missense variant: thousands of GWAS credible sets, so every control has work to do. */
const APOE = "19_44908822_C_T";
/** Intron variant of IL6R: a few hundred GWAS credible sets, small enough to export. */
const IL6R = "1_154453788_C_T";
/** Has GWAS credible sets, but only a handful: they fit on one page. */
const FEW = "6_160716958_G_A";
const FEW_SECTIONS = [
  "gwas-credible-sets",
  "in-silico-predictors",
  "variantgenomicregion",
  "qtl-credible-sets",
  "variant-effect-predictor",
];
/** Has no GWAS credible sets (only molecular QTL ones): the section must be absent. */
const NO_GWAS = "1_916631_AGAGCCGGCCCT_A";

const CREDIBLE_SET_ID = /^[0-9a-f]{32}$/;
const VARIANT_ID = /[0-9XYM]+_\d+_[ACGT]+_[ACGT]+/;

async function openSection(
  page: import("@playwright/test").Page,
  variantId: string
): Promise<GWASCredibleSetsSection> {
  await new VariantPage(page).goToVariantPage(variantId);
  await expectSectionLoaded(page, GWASCredibleSetsSection.id);
  const section = new GWASCredibleSetsSection(page);
  await section.expectLoaded();
  return section;
}

test.describe("Variant page: GWAS Credible Sets", () => {
  test("shows title, description, every column and a full first page", async ({ page }) => {
    const section = await openSection(page, APOE);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("GWAS Credible Sets");
      await expect(section.description).toContainText(
        `95% credible sets associated with complex traits containing ${APOE}`
      );
      await expectExternalLink(
        section.description.getByRole("link", { name: "Open Targets" }),
        "https://platform-docs.opentargets.org/variant#variant-to-phenotype"
      );
    });

    await test.step("exact columns, in order", async () => {
      await section.table.expectHeaders(GWAS_HEADERS);
    });

    await test.step("first page is full and the footer counts every credible set", async () => {
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
      const total = await section.table.total();
      expect(total, "APOE has thousands of GWAS credible sets").toBeGreaterThan(1000);
      await section.table.expectPosition(1, PAGE_SIZE, total);
      await section.table.expectFirstPage();
    });

    await test.step("the table offers search, columns, export and the API query", async () => {
      await expect(section.table.searchInput).toBeVisible();
      await expect(section.table.columnsButton).toBeVisible();
      await expect(section.table.exportButton).toBeVisible();
      await expect(section.table.apiQueryButton).toBeVisible();
    });
  });

  test("rows have real content in every column", async ({ page }) => {
    const section = await openSection(page, APOE);

    for (let row = 0; row < PAGE_SIZE; row++) {
      const label = `row ${row + 1}`;
      await test.step(label, async () => {
        await expect(section.viewLink(row)).toHaveAttribute(
          "href",
          /^\/credible-set\/[0-9a-f]{32}$/
        );
        await expect(section.cell(row, "leadVariant")).toContainText(VARIANT_ID);
        await expect(section.cell(row, "trait")).not.toHaveText(/^\s*$/);
        await expect(section.link(row, "study")).toHaveAttribute("href", /^\/study\/.+/);
        await expect(section.cell(row, "pValue")).toHaveText(/^\d+\.\d+×10\s*-\d+$/);
        await expect(section.cell(row, "beta")).toHaveText(/^(-?\d+\.\d+(e-?\d+)?|-?\d+|N\/A)$/);
        await expect(section.cell(row, "posteriorProbability")).toHaveText(/^(0\.\d+|1\.00|N\/A)$/);
        await expect(section.cell(row, "method")).toHaveText(/^(SuSiE|SuSiE-inf|PICS|N\/A)$/);
        await expect(section.cell(row, "size")).toHaveText(/^[\d,]+$/);
      });
    }

    await test.step("credible set ids are unique across the page", async () => {
      const hrefs = await section.table.rows
        .getByRole("link", { name: "View" })
        .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
      expect(new Set(hrefs).size).toBe(PAGE_SIZE);
      for (const href of hrefs) expect(href?.split("/").pop()).toMatch(CREDIBLE_SET_ID);
    });
  });

  test("starts sorted by L2G score, highest first", async ({ page }) => {
    const section = await openSection(page, APOE);

    const scores = numbersOf(await section.columnTexts("l2gScore"));
    expect(scores.length, "the top of the list has L2G scores").toBe(PAGE_SIZE);
    for (const score of scores) {
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    }
    expect(directionOf(scores)).toMatch(/^(descending|constant)$/);
    await expect(section.table.header("L2G score")).toHaveText("L2G score?");
  });

  test("a lead variant that is the page variant says so, any other links to its page", async ({
    page,
  }) => {
    const section = await openSection(page, APOE);
    await section.table.setPageSize(100);
    await expect(section.table.rows).toHaveCount(100);

    const leads = await section.table.rows.evaluateAll((rows) =>
      rows.map((row) => {
        const cell = row.querySelectorAll("td")[1];
        return {
          text: (cell.textContent ?? "").trim(),
          links: [...cell.querySelectorAll("a")].map((link) => link.getAttribute("href")),
        };
      })
    );
    const own = leads.filter((lead) => lead.text.includes(APOE));
    const others = leads.filter((lead) => !lead.text.includes(APOE));
    expect(own.length, "some credible sets are led by APOE").toBeGreaterThan(0);
    expect(others.length, "some are led by another variant").toBeGreaterThan(0);

    for (const lead of own) {
      expect(lead.text).toContain("self");
      expect(lead.links, "the page variant is not a link to itself").toEqual([]);
    }
    for (const lead of others) {
      expect(lead.text).not.toContain("self");
      const id = lead.text.match(VARIANT_ID)?.[0];
      expect(id, `"${lead.text}" has a variant id`).toBeTruthy();
      expect(lead.links).toEqual([`/variant/${id}`]);
    }
  });

  test.describe("pagination and page size", () => {
    test("next, previous, last and first walk through the pages", async ({ page }) => {
      const section = await openSection(page, APOE);
      const table = section.table;
      const total = await table.total();
      const pages = Math.ceil(total / PAGE_SIZE);
      const first = await table.rowTexts();

      await table.nextPageButton.click();
      await table.expectPosition(11, 20, total);
      await table.expectRowsChangedFrom(first);
      await expect(table.rows).toHaveCount(PAGE_SIZE);
      const second = await table.rowTexts();
      expect(
        second.filter((row) => first.includes(row)),
        "page 2 repeats nothing of page 1"
      ).toEqual([]);
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.previousPageButton).toBeEnabled();

      await table.previousPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectRowTexts(first);
      await table.expectFirstPage();

      await table.lastPageButton.click();
      const lastRows = total - (pages - 1) * PAGE_SIZE;
      await table.expectPosition((pages - 1) * PAGE_SIZE + 1, total, total);
      await expect(table.rows).toHaveCount(lastRows);
      await table.expectLastPage();

      await table.firstPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectRowTexts(first);
      await table.expectFirstPage();
    });

    test("page size changes how many rows a page holds and returns to page 1", async ({ page }) => {
      const section = await openSection(page, APOE);
      const table = section.table;
      const total = await table.total();
      await expect(table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);

      await table.nextPageButton.click();
      await table.expectPosition(11, 20, total);

      await table.setPageSize(25);
      await table.expectPosition(1, 25, total);
      await expect(table.rows).toHaveCount(25);
      await table.expectFirstPage();

      await table.setPageSize(100);
      await table.expectPosition(1, 100, total);
      await expect(table.rows).toHaveCount(100);
    });
  });

  test.describe("search", () => {
    test("by study id narrows the table to that study", async ({ page }) => {
      const section = await openSection(page, APOE);
      const study = await section.link(0, "study").innerText();
      const before = await section.table.total();

      await section.table.search(study);
      await expect.poll(() => section.table.total()).toBeLessThan(before);
      const total = await section.table.total();
      expect(total).toBeGreaterThan(0);
      const studies = await section.columnTexts("study");
      expect(studies.length).toBe(Math.min(total, PAGE_SIZE));
      for (const found of studies) expect(found).toBe(study);
    });

    test("by lead variant id shows only credible sets led by that variant", async ({ page }) => {
      const section = await openSection(page, APOE);
      const other = "19_44921921_G_A";

      await section.table.search(other);
      await expect
        .poll(async () =>
          (await section.columnTexts("leadVariant")).every((l) => l.includes(other))
        )
        .toBe(true);
      await expect(section.table.rows.first()).toContainText(other);
      expect(await section.table.total()).toBeGreaterThan(0);
      for (const lead of await section.columnTexts("leadVariant")) expect(lead).toContain(other);
    });

    test("by reported trait finds rows with that trait", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const trait = "Interleukin-6 receptor subunit alpha protein level";

      await section.table.search(trait);
      await expect
        .poll(async () => (await section.columnTexts("trait")).every((t) => t.includes(trait)))
        .toBe(true);
      const total = await section.table.total();
      expect(total).toBeGreaterThan(1);
      for (const found of await section.columnTexts("trait")) expect(found).toContain(trait);
    });

    test("a term nothing matches leaves an empty table, and clearing it restores the list", async ({
      page,
    }) => {
      const section = await openSection(page, APOE);
      const total = await section.table.total();
      const first = await section.table.rowTexts();

      await section.table.search("zzz-no-credible-set-matches-this");
      await expect(section.table.rows).toHaveCount(0);
      await expect(section.table.pagePosition).toHaveText(/^\d+ - 0 of 0$/);
      await expect(section.table.nextPageButton).toBeDisabled();
      await expect(section.table.firstPageButton).toBeDisabled();

      await section.table.clearSearch();
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
      await section.table.expectPosition(1, PAGE_SIZE, total);
      await section.table.expectRowTexts(first);
    });

    test("searching while on a later page goes back to the first page", async ({ page }) => {
      const section = await openSection(page, APOE);
      await section.table.nextPageButton.click();
      await expect(section.table.pagePosition).toHaveText(/^11 - 20 of \d+$/);

      await section.table.search("GCST");
      await expect(section.table.pagePosition).toHaveText(/^1 - \d+ of \d+$/);
      await section.table.expectFirstPage();
    });
  });

  test.describe("sorting", () => {
    const pValues = async (section: GWASCredibleSetsSection) =>
      (await section.columnTexts("pValue")).map(pValueLog10);

    test("P-value sorts in both directions", async ({ page }) => {
      const section = await openSection(page, APOE);
      const byDefault = await section.table.rowTexts();

      await section.table.clickHeader("P-value");
      await section.table.expectRowsChangedFrom(byDefault);
      await expect.poll(async () => directionOf(await pValues(section))).toBe("descending");
      await section.table.expectFirstPage();

      await section.table.clickHeader("P-value");
      await expect.poll(async () => directionOf(await pValues(section))).toBe("ascending");
      await section.table.expectFirstPage();
    });

    test("the order is global: page 2 continues where page 1 of the sorted list ends", async ({
      page,
    }) => {
      const section = await openSection(page, IL6R);
      await section.table.clickHeader("P-value");
      await expect.poll(async () => directionOf(await pValues(section))).toBe("descending");
      await section.table.clickHeader("P-value");
      await expect.poll(async () => directionOf(await pValues(section))).toBe("ascending");
      const page1 = await pValues(section);

      await section.table.nextPageButton.click();
      await expect(section.table.pagePosition).toHaveText(/^11 - 20 of \d+$/);
      await expect
        .poll(async () => (await pValues(section))[0])
        .toBeGreaterThanOrEqual(page1[page1.length - 1]);
      expect(directionOf(await pValues(section))).toMatch(/^(ascending|constant)$/);
    });

    test("L2G score reverses the default order: the lowest scores come first", async ({ page }) => {
      const section = await openSection(page, APOE);
      await section.sortBy("L2G score");
      await expect
        .poll(async () => directionOf(numbersOf(await section.columnTexts("l2gScore"))))
        .toBe("ascending");
      expect(numbersOf(await section.columnTexts("l2gScore"))[0]).toBeLessThan(0.5);
    });

    test("Lead variant sorts the table and reverses on the second click", async ({ page }) => {
      const section = await openSection(page, APOE);
      const byDefault = await section.table.rowTexts();

      await section.table.clickHeader("Lead variant");
      await section.table.expectRowsChangedFrom(byDefault);
      const first = await section.table.rowTexts();
      const firstLeads = await section.columnTexts("leadVariant");

      await section.table.clickHeader("Lead variant");
      await section.table.expectRowsChangedFrom(first);
      expect(await section.columnTexts("leadVariant")).not.toEqual(firstLeads);
    });

    test("only the columns the server can sort are sortable", async ({ page }) => {
      const section = await openSection(page, APOE);
      const byDefault = await section.table.rowTexts();

      await section.table.clickHeader("Reported trait");
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
      await section.table.expectRowTexts(byDefault);
    });
  });

  test("columns can be hidden and shown, except the credible set and lead variant", async ({
    page,
  }) => {
    const section = await openSection(page, APOE);
    const list = await section.table.openColumnPicker();

    await expect(list.getByRole("checkbox", { name: "Credible set", exact: true })).toBeDisabled();
    await expect(list.getByRole("checkbox", { name: "Lead variant", exact: true })).toBeDisabled();

    await list.getByRole("checkbox", { name: "Reported trait", exact: true }).uncheck();
    await expect(section.table.headers).toHaveCount(GWAS_HEADERS.length - 1);
    await expect(section.table.header("Reported trait")).toHaveCount(0);

    await list.getByRole("checkbox", { name: "Reported trait", exact: true }).check();
    await section.table.expectHeaders(GWAS_HEADERS);
  });

  test("column header tooltips explain Beta, Posterior probability, Fine-mapping confidence, Top L2G and L2G score", async ({
    page,
  }) => {
    const section = await openSection(page, APOE);
    /** Hover the "?" of a column and return the tooltip that says `text`. */
    const helpOf = async (column: string, text: string) => {
      await section.table.header(column).getByText("?").hover();
      const tooltip = page.getByRole("tooltip").filter({ hasText: text });
      await expect(tooltip).toBeVisible();
      return tooltip;
    };

    await expect(await helpOf("Beta", "Beta with respect to the ALT allele")).toHaveText(
      "Beta with respect to the ALT allele"
    );
    const posterior = await helpOf(
      "Posterior probability",
      "Posterior inclusion probability that the fixed page variant"
    );
    await expect(posterior).toContainText(APOE);

    const confidence = await helpOf(
      "Fine-mapping confidence",
      "Fine-mapping confidence based on the suitability"
    );
    await expectExternalLink(
      confidence.getByRole("link", { name: "here" }),
      "https://platform-docs.opentargets.org/credible-set#credible-set-confidence"
    );

    const topL2G = await helpOf("Top L2G", "Top gene prioritised by our locus-to-gene model");
    await expectExternalLink(
      topL2G.getByRole("link", { name: "our documentation" }),
      "https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g"
    );

    const l2gScore = await helpOf("L2G score", "Machine learning prediction linking a gene");
    await expect(l2gScore).toContainText("Score range [0,1]");
  });

  test.describe("links", () => {
    test("View opens the credible set of that row", async ({ page }) => {
      const section = await openSection(page, APOE);
      const href = await section.viewLink(0).getAttribute("href");
      const id = href?.split("/").pop() ?? "";
      expect(id).toMatch(CREDIBLE_SET_ID);

      await section.viewLink(0).click();
      await expect(page).toHaveURL(new RegExp(`/credible-set/${id}$`));
      await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
      await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
    });

    test("a lead variant other than the page variant opens that variant", async ({ page }) => {
      const section = await openSection(page, APOE);
      await section.table.search("19_44921921_G_A");
      await expect(section.cell(0, "leadVariant")).toContainText("19_44921921_G_A");
      const link = section.link(0, "leadVariant");
      await expect(link).toHaveAttribute("href", "/variant/19_44921921_G_A");

      await link.click();
      await expect(page).toHaveURL(/\/variant\/19_44921921_G_A$/);
      await expect(page.getByTestId("profile-page-header-text")).toContainText("19_44921921_G_A");
    });

    test("the study link opens the study with that id", async ({ page }) => {
      const section = await openSection(page, APOE);
      const study = (await section.link(0, "study").innerText()).trim();
      await expect(section.link(0, "study")).toHaveAttribute("href", `/study/${study}`);

      await section.link(0, "study").click();
      await expect(page).toHaveURL(new RegExp(`/study/${study}$`));
      await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
      await expect(page.getByTestId("profile-page-header-text")).toContainText(study);
    });

    test("a disease link opens the disease it names", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const link = section.link(0, "disease");
      const name = (await link.innerText()).trim();
      const href = await link.getAttribute("href");
      expect(href).toMatch(/^\/disease\/[A-Za-z]+_\d+$/);

      await link.click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
      await expect(page.getByTestId("profile-page-header-text")).toContainText(name, {
        ignoreCase: true,
      });
    });

    test("the Top L2G gene opens its target page", async ({ page }) => {
      const section = await openSection(page, APOE);
      const link = section.link(0, "topL2G");
      await expect(link).toHaveText("APOE");
      await expect(link).toHaveAttribute("href", "/target/ENSG00000130203");

      await link.click();
      await expect(page).toHaveURL(/\/target\/ENSG00000130203$/);
      await expect(page.getByTestId("profile-page-header-text")).toHaveText("APOE");
    });

    test("going back from a linked page returns to the variant with its section", async ({
      page,
    }) => {
      const section = await openSection(page, APOE);
      await section.viewLink(0).click();
      await expect(page).toHaveURL(/\/credible-set\//);

      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/variant/${APOE}`));
      await expectSectionLoaded(page, GWASCredibleSetsSection.id);
      await new GWASCredibleSetsSection(page).expectLoaded();
    });
  });

  test("clicking a L2G score opens the locus-to-gene popover for that credible set", async ({
    page,
  }) => {
    const section = await openSection(page, APOE);
    const gene = (await section.link(0, "topL2G").innerText()).trim();
    const score = (await section.cell(0, "l2gScore").innerText()).trim();

    await section.l2gTrigger(0).click();
    const popover = section.l2gPopover;
    await expect(popover).toBeVisible();
    await expect(popover).toContainText("Colocalisation");
    await expect(popover.getByRole("link", { name: gene, exact: true })).toBeVisible();
    await expect(popover).toContainText(score);

    await page.keyboard.press("Escape");
    await expect(popover).toBeHidden();

    await test.step("another row opens its own popover", async () => {
      await section.l2gTrigger(1).click();
      await expect(section.l2gPopover).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(section.l2gPopover).toBeHidden();
    });
  });

  test("exports every credible set as JSON and TSV, named after the variant", async ({ page }) => {
    const section = await openSection(page, IL6R);
    const total = await section.table.total();

    const json = await section.table.download("Json");
    expect(json.filename).toBe(`${IL6R}-gwas-credible-sets-variant.json`);
    const rows = JSON.parse(json.text) as Record<string, unknown>[];
    expect(rows).toHaveLength(total);
    expect(Object.keys(rows[0])).toEqual(
      expect.arrayContaining(["credibleSet", "leadVariant", "study", "pValue", "topL2G"])
    );
    for (const row of rows) {
      expect(row.leadVariant).toMatch(VARIANT_ID);
      expect(String(row.study)).not.toBe("");
    }

    const tsv = await section.table.download("TSV");
    expect(tsv.filename).toBe(`${IL6R}-gwas-credible-sets-variant.tsv`);
    const lines = tsv.text.trim().split("\n");
    expect(lines).toHaveLength(total + 1);
    expect(lines[0].split("\t")).toEqual(expect.arrayContaining(["study", "pValue"]));
  });

  test("the API query drawer holds the table query", async ({ page }) => {
    const section = await openSection(page, IL6R);
    await section.expectApiQuery("GWASCredibleSetsTableQuery");
  });

  test("a variant with only a few GWAS credible sets shows them on one page", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(FEW);
    await expectSections(page, FEW_SECTIONS);
    const section = await openSection(page, FEW);

    const total = await section.table.total();
    expect(total).toBeLessThan(PAGE_SIZE);
    await expect(section.table.rows).toHaveCount(total);
    await section.table.expectPosition(1, total, total);
    await section.table.expectFirstPage(true);
    await section.table.setPageSize(25);
    await expect(section.table.rows).toHaveCount(total);
  });

  test("a variant without GWAS credible sets has no GWAS section", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(NO_GWAS);
    await expectSections(page, expectedSectionsFor(NO_GWAS));
    await expect(sectionLocator(page, GWASCredibleSetsSection.id)).toHaveCount(0);
  });

  test("every section the variant should have is rendered with the GWAS one", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(APOE);
    await expectSections(page, expectedSectionsFor(APOE));
  });
});
