import { type Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import type { TestConfig } from "../../../../types";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { MolQTLColocSection } from "../../../../POM/objects/widgets/CredibleSet/molQTLColocSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { VariantPage } from "../../../../POM/page/variant/variant";
import { expectSectionLoaded, expectSections, sectionLocator } from "../../../../utils/sections";

const { column, operation } = MolQTLColocSection;
const PAGE_SIZE = 10;
const THREE_DECIMALS = /^\d\.\d{3}$/;
const P_VALUE = /^\d\.\d{2}×10\s?-?\d+$/;
const STUDY_TYPE = new RegExp(`^(${MolQTLColocSection.studyTypes.join("|")})\\s*(trans)?$`);

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

type ColocRow = {
  otherCredibleSet: { isTransQtl: boolean; study: { studyType: string; condition: string | null } };
  betaRatioSignAverage: number | null;
};

test.describe("Credible set page: molQTL colocalisation", () => {
  test("shows title, description and the column headers", async ({ page, testConfig }) => {
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

  test("only molecular QTL studies are listed, never GWAS", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const types = await coloc.columnTexts(column.type);
    for (const type of types) {
      expect(MolQTLColocSection.studyTypes, `"${type}" is a molQTL study type`).toContain(
        type.replace(/\s*trans$/, "")
      );
    }
    for (const studyId of await Promise.all(
      Array.from({ length: PAGE_SIZE }, (_, index) => coloc.studyLink(index).innerText())
    )) {
      expect(studyId, "molQTL study ids are QTL study ids, not GCST accessions").not.toMatch(/^GCST/);
    }
  });

  test("the Type column, trans chip and Directionality match what the API returned", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const response = page.waitForResponse(
      (candidate) =>
        (candidate.request().postData() ?? "").includes(operation) &&
        (candidate.request().postData() ?? "").includes('"size":100')
    );
    await coloc.table.setPageSize(100);
    const body = (await (await response).json()) as {
      data: { credibleSet: { molqtlcolocalisation: { rows: ColocRow[] } } };
    };
    const rows = body.data.credibleSet.molqtlcolocalisation.rows;
    await expect(coloc.rows).toHaveCount(rows.length);

    const types = await coloc.columnTexts(column.type);
    expect(types).toEqual(
      rows.map((row) =>
        `${row.otherCredibleSet.study.studyType}${row.otherCredibleSet.isTransQtl ? " trans" : ""}`
      )
    );
    await expect(coloc.section.getByText("trans", { exact: true })).toHaveCount(
      rows.filter((row) => row.otherCredibleSet.isTransQtl).length
    );

    const expectedDirection = rows.map((row) => {
      const value = row.betaRatioSignAverage;
      if (value === null) return "N/A";
      if (value <= -0.99) return "Opposite";
      return value >= 0.99 ? "Same" : "Inconclusive";
    });
    expect(await coloc.columnTexts(column.directionality)).toEqual(expectedDirection);
  });

  test("Affected gene and Affected tissue/cell show the study's gene and tissue", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    for (let index = 0; index < PAGE_SIZE; index += 1) {
      await expect(coloc.cell(index, column.gene), `row ${index + 1} gene`).not.toHaveText("?API?");
      await expect(coloc.cell(index, column.tissue), `row ${index + 1} tissue`).not.toHaveText("?API?");
    }
  });

  test("Directionality tooltip gives the beta ratio sign average", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    await coloc.table.setPageSize(100);
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

  test("pages through the server and restarts at page 1 when the page size changes", async ({
    page,
    testConfig,
  }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const total = await coloc.total();
    expect(total, "more than 100 molQTL colocalisations, so three page sizes differ").toBeGreaterThan(100);
    const firstPage = await coloc.table.rowTexts();
    await coloc.expectOnFirstOfSeveralPages();

    await test.step("next asks the API for page 2 and shows different rows", async () => {
      const requested = await coloc.clickAndGetPageRequest(coloc.nextPageButton, operation);
      expect(requested).toEqual({ index: 1, size: PAGE_SIZE });
      await coloc.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
      await coloc.table.expectRowsChangedFrom(firstPage);
      await expect(coloc.rows).toHaveCount(PAGE_SIZE);
    });

    await test.step("previous returns to exactly the first page", async () => {
      await coloc.previousPageButton.click();
      await coloc.expectPosition(1, PAGE_SIZE, total);
      await coloc.table.expectRowTexts(firstPage);
      await coloc.expectOnFirstOfSeveralPages();
    });

    await test.step("a new page size starts again at page 1", async () => {
      await coloc.nextPageButton.click();
      await coloc.table.setPageSize(25);
      await coloc.expectPosition(1, 25, total);
      await expect(coloc.rows).toHaveCount(25);
    });

    await test.step("with 100 per page the last page holds the remainder", async () => {
      await coloc.table.setPageSize(100);
      await coloc.expectPosition(1, 100, total);
      const lastIndex = Math.ceil(total / 100) - 1;
      for (let index = 0; index < lastIndex; index += 1) {
        await coloc.nextPageButton.click();
      }
      const remainder = total - lastIndex * 100;
      await coloc.expectPosition(lastIndex * 100 + 1, total, total);
      await expect(coloc.rows).toHaveCount(remainder);
      await coloc.expectOnLastPage();
      await coloc.firstPageButton.click();
      await coloc.expectPosition(1, 100, total);
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

  test("the study link opens that QTL study's page", async ({ page, testConfig }) => {
    const coloc = await open(page, credibleSets(testConfig).primary);
    const studyId = (await coloc.studyLink(0).innerText()).trim();
    await coloc.studyLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/study/${studyId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toBeVisible();
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
