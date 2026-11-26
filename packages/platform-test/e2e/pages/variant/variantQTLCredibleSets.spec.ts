import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  QTL_HEADERS,
  QTLCredibleSetsSection,
} from "../../../POM/objects/widgets/shared/qtlCredibleSetsSection";
import {
  directionOf,
  numbersOf,
  pValueLog10,
} from "../../../POM/objects/widgets/shared/variantCredibleSetsTable";
import { VariantPage } from "../../../POM/page/variant/variant";
import { expectSectionLoaded, expectSections, sectionLocator } from "../../../utils/sections";

const PAGE_SIZE = 10;
/** Intron variant of IL6R: hundreds of molQTL credible sets, mostly cis (affected gene IL6R). */
const IL6R = "1_154453788_C_T";
/** APOE missense variant: a few dozen molQTL credible sets, many of them trans pQTLs. */
const APOE = "19_44908822_C_T";
/** Has GWAS credible sets but no molQTL ones: the section must be absent. */
const NO_QTL = "2_21006288_C_T";
const NO_QTL_SECTIONS = [
  "eva",
  "gwas-credible-sets",
  "in-silico-predictors",
  "molecular-structure",
  "uniprot-variants",
  "variant-effect-predictor",
];

const VARIANT_ID = /\d+_\d+_[ACGT]+_[ACGT]+/;

async function openSection(page: Page, variantId: string): Promise<QTLCredibleSetsSection> {
  await new VariantPage(page).goToVariantPage(variantId);
  await expectSectionLoaded(page, QTLCredibleSetsSection.id);
  const section = new QTLCredibleSetsSection(page);
  await section.expectLoaded();
  return section;
}

test.describe("Variant page: molQTL Credible Sets", () => {
  test("shows title, description, every column and a full first page", async ({ page }) => {
    const section = await openSection(page, IL6R);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("molQTL Credible Sets");
      await expect(section.description).toContainText(
        `95% credible sets fine-mapped from quantitative trait loci associated with molecular traits containing ${IL6R}`
      );
      await expectExternalLink(
        section.description.getByRole("link", { name: "Open Targets" }),
        "https://platform-docs.opentargets.org/variant#variant-to-phenotype"
      );
    });

    await section.table.expectHeaders(QTL_HEADERS);
    await expect(section.table.rows).toHaveCount(PAGE_SIZE);
    const total = await section.table.total();
    expect(total).toBeGreaterThan(PAGE_SIZE);
    await section.table.expectPosition(1, PAGE_SIZE, total);
    await section.table.expectFirstPage();
    await expect(section.table.searchInput).toBeVisible();
    await expect(section.table.exportButton).toBeVisible();
    await expect(section.table.apiQueryButton).toBeVisible();
  });

  test("rows have real content: study, QTL type, affected gene, tissue, statistics", async ({
    page,
  }) => {
    const section = await openSection(page, IL6R);

    for (let row = 0; row < PAGE_SIZE; row++) {
      await test.step(`row ${row + 1}`, async () => {
        await expect(section.viewLink(row)).toHaveAttribute(
          "href",
          /^\/credible-set\/[0-9a-f]{32}$/
        );
        await expect(section.cell(row, "leadVariant")).toContainText(VARIANT_ID);
        await expect(section.link(row, "study")).toHaveAttribute("href", /^\/study\/.+/);
        await expect(section.cell(row, "type")).toHaveText(
          /^(sc)?(e|s|p|tu)QTL\s*(trans)?\s*$/i
        );
        await expect(section.link(row, "gene")).toHaveAttribute("href", /^\/target\/ENSG\d{11}$/);
        await expect(section.cell(row, "tissue")).not.toHaveText(/^\s*$/);
        await expect(section.cell(row, "condition")).not.toHaveText(/^\s*$/);
        await expect(section.cell(row, "pValue")).toHaveText(/^\d+\.\d+×10\s*-\d+$/);
        await expect(section.cell(row, "beta")).toHaveText(/^(-?\d+\.\d+(e-?\d+)?|-?\d+|N\/A)$/);
        await expect(section.cell(row, "posteriorProbability")).toHaveText(
          /^(0\.\d+|1\.00|N\/A)$/
        );
        await expect(section.cell(row, "method")).toHaveText(/^(SuSiE|SuSiE-inf|PICS)$/);
        await expect(section.cell(row, "size")).toHaveText(/^[\d,]+$/);
      });
    }
  });

  test("starts sorted by p-value, smallest first", async ({ page }) => {
    const section = await openSection(page, IL6R);
    const p = (await section.columnTexts("pValue")).map(pValueLog10);
    expect(directionOf(p)).toMatch(/^(ascending|constant)$/);
    expect(p[0]).toBeLessThan(-10);
  });

  test("the affected gene links to its target and a trans QTL is flagged", async ({ page }) => {
    const section = await openSection(page, APOE);
    await section.table.setPageSize(100);
    const total = await section.table.total();
    await expect(section.table.rows).toHaveCount(total);

    const types = await section.columnTexts("type");
    const trans = types.filter((type) => /trans/.test(type));
    expect(trans.length, "APOE has trans pQTLs").toBeGreaterThan(0);
    expect(types.filter((type) => !/trans/.test(type)).length, "and cis ones").toBeGreaterThan(0);

    await expect(section.cell(0, "gene").getByRole("link")).toHaveAttribute(
      "href",
      /^\/target\/ENSG\d{11}$/
    );
  });

  test("the tissue or cell links to the Ontology Lookup Service", async ({ page }) => {
    const section = await openSection(page, IL6R);
    const link = section.link(0, "tissue");
    await expectExternalLink(link, /^https:\/\/www\.ebi\.ac\.uk\/ols4\/search\?q=\S+$/);
    expect((await link.innerText()).trim()).not.toBe("");
  });

  test.describe("pagination and page size", () => {
    test("next, previous, last and first walk through the pages", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const table = section.table;
      const total = await table.total();
      const pages = Math.ceil(total / PAGE_SIZE);
      const first = await table.rowTexts();

      await table.nextPageButton.click();
      await table.expectPosition(11, 20, total);
      await table.expectRowsChangedFrom(first);
      expect((await table.rowTexts()).filter((row) => first.includes(row))).toEqual([]);
      await expect(table.previousPageButton).toBeEnabled();

      await table.previousPageButton.click();
      await table.expectRowTexts(first);
      await table.expectFirstPage();

      await table.lastPageButton.click();
      await table.expectPosition((pages - 1) * PAGE_SIZE + 1, total, total);
      await expect(table.rows).toHaveCount(total - (pages - 1) * PAGE_SIZE);
      await table.expectLastPage();

      await table.firstPageButton.click();
      await table.expectRowTexts(first);
    });

    test("page size changes how many rows a page holds", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const total = await section.table.total();
      await expect(section.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
      await section.table.nextPageButton.click();
      await expect(section.table.pagePosition).toHaveText(/^11 - 20 of \d+$/);

      await section.table.setPageSize(25);
      await section.table.expectPosition(1, 25, total);
      await expect(section.table.rows).toHaveCount(25);

      await section.table.setPageSize(100);
      await section.table.expectPosition(1, 100, total);
      await expect(section.table.rows).toHaveCount(100);
    });
  });

  test.describe("search", () => {
    test("by affected gene symbol keeps only that gene", async ({ page }) => {
      const section = await openSection(page, APOE);
      const before = await section.table.total();
      await section.table.search("PLA2G10");

      await expect.poll(() => section.table.total()).toBeLessThan(before);
      const genes = await section.columnTexts("gene");
      expect(genes.length).toBeGreaterThan(0);
      for (const gene of genes) expect(gene).toBe("PLA2G10");
    });

    test("by tissue narrows the table to that tissue", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const before = await section.table.total();
      await section.table.search("neutrophil");

      await expect.poll(() => section.table.total()).toBeLessThan(before);
      const tissues = await section.columnTexts("tissue");
      expect(tissues.length).toBeGreaterThan(0);
      for (const tissue of tissues) expect(tissue.toLowerCase()).toContain("neutrophil");
    });

    test("by condition narrows the table to that condition", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const before = await section.table.total();
      await section.table.search("sepsis");

      await expect.poll(() => section.table.total()).toBeLessThan(before);
      for (const condition of await section.columnTexts("condition")) {
        expect(condition.toLowerCase()).toContain("sepsis");
      }
    });

    test("by study id finds that study", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const study = (await section.link(0, "study").innerText()).trim();
      await section.table.search(study);

      await expect.poll(() => section.table.total()).toBeLessThanOrEqual(PAGE_SIZE);
      const studies = await section.columnTexts("study");
      expect(studies.length).toBeGreaterThan(0);
      for (const found of studies) expect(found).toBe(study);
    });

    test("a term nothing matches leaves an empty table, and clearing it restores the list", async ({
      page,
    }) => {
      const section = await openSection(page, IL6R);
      const total = await section.table.total();
      const first = await section.table.rowTexts();

      await section.table.search("zzz-no-qtl-matches-this");
      await expect(section.table.rows).toHaveCount(0);
      await expect(section.table.pagePosition).toHaveText(/^\d+ - 0 of 0$/);
      await expect(section.table.nextPageButton).toBeDisabled();

      await section.table.clearSearch();
      await section.table.expectPosition(1, PAGE_SIZE, total);
      await section.table.expectRowTexts(first);
    });
  });

  test.describe("sorting", () => {
    test("P-value reverses the default order: the weakest association comes first", async ({
      page,
    }) => {
      const section = await openSection(page, IL6R);
      const byDefault = await section.table.rowTexts();
      const strongest = pValueLog10((await section.columnTexts("pValue"))[0]);

      await section.table.clickHeader("P-value");
      await section.table.expectRowsChangedFrom(byDefault);
      await expect
        .poll(async () => pValueLog10((await section.columnTexts("pValue"))[0]))
        .toBeGreaterThan(strongest + 10);
      await section.table.expectFirstPage();
    });

    test("Beta sorts across the pages", async ({ page }) => {
      const section = await openSection(page, IL6R);
      await section.sortBy("Beta");
      await expect
        .poll(async () => directionOf(numbersOf(await section.columnTexts("beta"))))
        .toMatch(/^(ascending|descending)$/);
      const first = directionOf(numbersOf(await section.columnTexts("beta")));

      await section.sortBy("Beta");
      await expect
        .poll(async () => directionOf(numbersOf(await section.columnTexts("beta"))))
        .toBe(first === "ascending" ? "descending" : "ascending");
    });

    test("Posterior probability sorts", async ({ page }) => {
      const section = await openSection(page, IL6R);
      await section.sortBy("Posterior probability");
      await expect
        .poll(async () =>
          directionOf(numbersOf(await section.columnTexts("posteriorProbability")))
        )
        .toMatch(/^(ascending|descending)$/);
    });

    test("Credible set size sorts", async ({ page }) => {
      const section = await openSection(page, IL6R);
      await section.table.clickHeader("Credible set size");
      await expect
        .poll(async () =>
          directionOf((await section.columnTexts("size")).map((size) => Number(size.replace(/,/g, ""))))
        )
        .toMatch(/^(ascending|descending)$/);
    });

    test("a column the server cannot sort leaves the order alone", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const byDefault = await section.table.rowTexts();
      await section.table.clickHeader("Affected gene");
      await expect(section.table.rows).toHaveCount(PAGE_SIZE);
      await section.table.expectRowTexts(byDefault);
    });
  });

  test("columns can be hidden and shown, except the credible set and lead variant", async ({
    page,
  }) => {
    const section = await openSection(page, IL6R);
    const list = await section.table.openColumnPicker();
    await expect(list.getByRole("checkbox", { name: "Credible set", exact: true })).toBeDisabled();
    await expect(list.getByRole("checkbox", { name: "Lead variant", exact: true })).toBeDisabled();

    await list.getByRole("checkbox", { name: "Condition", exact: true }).uncheck();
    await expect(section.table.headers).toHaveCount(QTL_HEADERS.length - 1);
    await expect(section.table.header("Condition")).toHaveCount(0);

    await list.getByRole("checkbox", { name: "Condition", exact: true }).check();
    await section.table.expectHeaders(QTL_HEADERS);
  });

  test("column header tooltips explain Beta, Posterior probability and Fine-mapping confidence", async ({
    page,
  }) => {
    const section = await openSection(page, IL6R);
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
    await expect(posterior).toContainText(IL6R);

    const confidence = await helpOf(
      "Fine-mapping confidence",
      "Fine-mapping confidence based on the suitability"
    );
    await expectExternalLink(
      confidence.getByRole("link", { name: "here" }),
      "https://platform-docs.opentargets.org/credible-set#credible-set-confidence"
    );
  });

  test.describe("links", () => {
    test("View opens the credible set of that row", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const id = (await section.viewLink(0).getAttribute("href"))?.split("/").pop() ?? "";
      expect(id).toMatch(/^[0-9a-f]{32}$/);

      await section.viewLink(0).click();
      await expect(page).toHaveURL(new RegExp(`/credible-set/${id}$`));
      await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
    });

    test("the study link opens the study with that id", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const study = (await section.link(0, "study").innerText()).trim();
      await expect(section.link(0, "study")).toHaveAttribute("href", `/study/${study}`);

      await section.link(0, "study").click();
      await expect(page).toHaveURL(new RegExp(`/study/${study}$`));
      await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
      await expect(page.getByTestId("profile-page-header-text")).toContainText(study);
    });

    test("the affected gene opens its target page", async ({ page }) => {
      const section = await openSection(page, IL6R);
      const link = section.link(0, "gene");
      await expect(link).toHaveText("IL6R");
      await expect(link).toHaveAttribute("href", "/target/ENSG00000160712");

      await link.click();
      await expect(page).toHaveURL(/\/target\/ENSG00000160712$/);
      await expect(page.getByTestId("profile-page-header-text")).toHaveText("IL6R");
    });

    test("a lead variant other than the page variant opens that variant, the page variant is marked self", async ({
      page,
    }) => {
      const section = await openSection(page, IL6R);
      await section.table.setPageSize(25);
      const leads = await section.columnTexts("leadVariant");
      expect(leads.some((lead) => lead.includes(IL6R))).toBe(true);
      const otherRow = leads.findIndex((lead) => !lead.includes(IL6R));
      expect(otherRow, "some credible sets are led by another variant").toBeGreaterThanOrEqual(0);
      const selfRow = leads.findIndex((lead) => lead.includes(IL6R));
      await expect(section.cell(selfRow, "leadVariant")).toContainText("self");
      await expect(section.cell(selfRow, "leadVariant").getByRole("link")).toHaveCount(0);

      const other = leads[otherRow].match(VARIANT_ID)?.[0] ?? "";
      await expect(section.link(otherRow, "leadVariant")).toHaveAttribute(
        "href",
        `/variant/${other}`
      );
      await section.link(otherRow, "leadVariant").click();
      await expect(page).toHaveURL(new RegExp(`/variant/${other}$`));
      await expect(page.getByTestId("profile-page-header-text")).toContainText(other);
    });
  });

  test("exports every molQTL credible set as JSON and TSV, named after the variant", async ({
    page,
  }) => {
    const section = await openSection(page, APOE);
    const total = await section.table.total();

    const json = await section.table.download("Json");
    expect(json.filename).toBe(`${APOE}-qtl-credible-sets-variant.json`);
    const rows = JSON.parse(json.text) as Record<string, unknown>[];
    expect(rows).toHaveLength(total);
    expect(Object.keys(rows[0])).toEqual(
      expect.arrayContaining(["credibleSet", "study", "affectedGene", "pValue"])
    );
    for (const row of rows) {
      expect(row.leadVariant).toMatch(VARIANT_ID);
      expect(String(row.study)).not.toBe("");
    }

    const tsv = await section.table.download("TSV");
    expect(tsv.filename).toBe(`${APOE}-qtl-credible-sets-variant.tsv`);
    const lines = tsv.text.trim().split("\n");
    expect(lines).toHaveLength(total + 1);
    expect(lines[0].split("\t")).toEqual(expect.arrayContaining(["study", "pValue"]));
  });

  test("the API query drawer holds the table query", async ({ page }) => {
    const section = await openSection(page, IL6R);
    await section.table.expectApiQuery("VariantQTLCredibleSetsQuery");
  });

  test("every section the variant should have is rendered with the molQTL one", async ({
    page,
  }) => {
    await new VariantPage(page).goToVariantPage(IL6R);
    await expectSections(page, expectedSectionsFor(IL6R));
  });

  test("a variant without molQTL credible sets has no molQTL section", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(NO_QTL);
    await expectSections(page, NO_QTL_SECTIONS);
    await expect(sectionLocator(page, QTLCredibleSetsSection.id)).toHaveCount(0);
  });
});
