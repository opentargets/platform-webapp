import { type Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import type { TestConfig } from "../../../../types";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { GWASColocSection } from "../../../../POM/objects/widgets/CredibleSet/gwasColocSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { VariantPage } from "../../../../POM/page/variant/variant";
import { expectSectionLoaded, expectSections, sectionLocator } from "../../../../utils/sections";

const { column, operation } = GWASColocSection;
const PAGE_SIZE = 10;
const THREE_DECIMALS = /^\d\.\d{3}$/;
const P_VALUE = /^\d\.\d{2}×10\s?-?\d+$/;
const DIRECTIONS = ["Same", "Opposite", "Inconclusive", "N/A"];

/** The credible sets these tests use; fails loudly if the test config lacks one. */
function credibleSets(config: TestConfig): { primary: string; qtl: string } {
  const { primary, qtl } = config.credibleSet ?? {};
  if (!primary || !qtl) throw new Error("the test config needs credibleSet.primary and credibleSet.qtl");
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

test.describe("Credible set page: GWAS colocalisation", () => {
  test("shows title, description and the column headers", async ({ page, testConfig }) => {
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

    await test.step("header tooltips explain Directionality, H3, H4 and CLPP", async () => {
      const tooltips: Record<string, string> = {
        Directionality: "Effect directionality based on the ratio of betas between the two credible sets",
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
        await expect(coloc.credibleSetLink(index), "a set never colocalises with itself").not.toHaveAttribute(
          "href",
          `/credible-set/${primary}`
        );
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
    await coloc.table.setPageSize(100);
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
        coloc.rows.locator(`td:nth-child(${column.directionality + 1})`).filter({ hasText: /^N\/A$/ }).first()
      ).toBeVisible();
    });
  });

  test("pages through the server: next, previous, first, and the ends disable the right buttons", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const total = await coloc.total();
    const firstPage = await coloc.table.rowTexts();
    await coloc.expectOnFirstOfSeveralPages();

    await test.step("next asks the API for page 2 and shows different rows", async () => {
      const requested = await coloc.clickAndGetPageRequest(coloc.nextPageButton, operation);
      expect(requested).toEqual({ index: 1, size: PAGE_SIZE });
      await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
      await coloc.table.expectRowsChangedFrom(firstPage);
      await expect(coloc.rows).toHaveCount(PAGE_SIZE);
      await expect(coloc.previousPageButton).toBeEnabled();
      await expect(coloc.firstPageButton).toBeEnabled();
    });

    await test.step("previous returns to exactly the first page", async () => {
      await coloc.previousPageButton.click();
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await coloc.table.expectRowTexts(firstPage);
      await coloc.expectOnFirstOfSeveralPages();
    });

    await test.step("first jumps back from a later page", async () => {
      await coloc.nextPageButton.click();
      await coloc.nextPageButton.click();
      await coloc.expectPosition(PAGE_SIZE * 2 + 1, PAGE_SIZE * 3, total);
      await coloc.firstPageButton.click();
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await coloc.table.expectRowTexts(firstPage);
    });
  });

  test("page size changes the rows per page, restarts at page 1 and the last page holds the remainder", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const total = await coloc.total();
    await coloc.nextPageButton.click();
    await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);

    await test.step("25 per page goes back to page 1", async () => {
      await coloc.table.setPageSize(25);
      await coloc.expectPosition(1, 25, total);
      await expect(coloc.rows).toHaveCount(25);
    });

    await test.step("100 per page, then the last page has the remainder and next is off", async () => {
      await coloc.table.setPageSize(100);
      await coloc.expectPosition(1, 100, total);
      await expect(coloc.rows).toHaveCount(100);
      await coloc.nextPageButton.click();
      await coloc.expectPosition(101, total, total);
      await expect(coloc.rows).toHaveCount(total - 100);
      await coloc.expectOnLastPage();
    });

    await test.step("page 2 rows differ from page 1 rows", async () => {
      const secondPage = await coloc.table.rowTexts();
      await coloc.firstPageButton.click();
      await coloc.table.expectRowsChangedFrom(secondPage);
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
      await expect(coloc.rows.first().locator("td")).toHaveCount(GWASColocSection.headers.length - 1);
    });

    await test.step("checking it again brings it back in place", async () => {
      await list.getByRole("checkbox", { name: "Reported trait" }).check();
      await expect(coloc.headers).toHaveText(GWASColocSection.headers);
    });
  });

  test("Export downloads every colocalisation as JSON and TSV", async ({ page, testConfig }) => {
    const credibleSetId = credibleSets(testConfig).primary;
    const coloc = await open(page, credibleSetId);
    const total = await coloc.total();
    const firstPageStudies = await Promise.all(
      Array.from({ length: PAGE_SIZE }, (_, index) => coloc.studyLink(index).innerText())
    );

    await test.step("JSON holds all rows, not just the page on screen", async () => {
      const { filename, text } = await coloc.table.download("Json");
      expect(filename).toBe(`${credibleSetId}-credibleSets.json`);
      const rows = JSON.parse(text) as Record<string, unknown>[];
      expect(rows).toHaveLength(total);
      expect(rows.slice(0, PAGE_SIZE).map((row) => row.study)).toEqual(firstPageStudies);
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

  test("the API query button opens the playground with this section's query", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    await coloc.expectApiQuery(operation);
  });

  test("the credible set link opens the colocalising credible set", async ({ page, testConfig }) => {
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

  test("a credible set with few colocalisations fits on one short page", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).qtl);
    const total = await coloc.total();
    expect(total, "the pQTL credible set has a handful of GWAS colocalisations").toBeLessThanOrEqual(25);
    expect(total).toBeGreaterThan(PAGE_SIZE);

    await coloc.expectPosition(1, PAGE_SIZE, total);
    await coloc.expectOnFirstOfSeveralPages();
    await coloc.nextPageButton.click();
    await coloc.expectPosition(PAGE_SIZE + 1, total, total);
    await expect(coloc.rows).toHaveCount(total - PAGE_SIZE);
    await coloc.expectOnLastPage();
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
