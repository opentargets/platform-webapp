import { type Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import type { TestConfig } from "../../../../types";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { CredibleSetEnhancerToGenePredictionsSection } from "../../../../POM/objects/widgets/CredibleSet/enhancerToGenePredictionsSection";
import { CredibleSetPage } from "../../../../POM/page/credibleSet";
import { expectSectionLoaded, expectSections } from "../../../../utils/sections";

const { column, operation } = CredibleSetEnhancerToGenePredictionsSection;
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
  if (!primary || !qtl) throw new Error("the test config needs credibleSet.primary and credibleSet.qtl");
  return { primary, qtl };
}

async function open(page: Page, credibleSetId: string): Promise<CredibleSetEnhancerToGenePredictionsSection> {
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

  test("the best prediction comes first and the gene links go to target pages", async ({
    page,
    testConfig,
  }) => {
    const e2g = await open(page, credibleSets(testConfig).primary);
    const scores = (await e2g.columnTexts(column.score)).map(Number);
    expect(scores, "predictions arrive highest score first").toEqual([...scores].sort((a, b) => b - a));
    expect(await e2g.columnTexts(column.gene), "GGCX is the gene this enhancer most confidently regulates").toContain(
      "GGCX"
    );
  });

  test("pages through the server: 16 predictions are 10 then 6", async ({ page, testConfig }) => {
    const e2g = await open(page, credibleSets(testConfig).primary);
    const total = await e2g.total();
    expect(total, "the set has more than one page and less than two").toBeGreaterThan(PAGE_SIZE);
    expect(total).toBeLessThanOrEqual(PAGE_SIZE * 2);
    const firstPage = await e2g.table.rowTexts();
    await e2g.expectOnFirstOfSeveralPages();

    await test.step("next asks for page 2 and shows the remainder", async () => {
      const requested = await e2g.clickAndGetPageRequest(e2g.nextPageButton, operation);
      expect(requested).toEqual({ index: 1, size: PAGE_SIZE });
      await e2g.expectPosition(PAGE_SIZE + 1, total, total);
      await expect(e2g.rows).toHaveCount(total - PAGE_SIZE);
      await e2g.table.expectRowsChangedFrom(firstPage);
      await e2g.expectOnLastPage();
    });

    await test.step("page 2 continues after page 1: lower scores", async () => {
      const first = Math.min(...[...firstPage].map((text) => Number(text.split(" ").at(-1))));
      const second = Math.max(...(await e2g.columnTexts(column.score)).map(Number));
      expect(second).toBeLessThanOrEqual(first);
    });

    await test.step("previous returns to exactly the first page", async () => {
      await e2g.previousPageButton.click();
      await e2g.table.expectRowTexts(firstPage);
      await e2g.expectOnFirstOfSeveralPages();
    });

    await test.step("a page size of 25 shows everything on one page", async () => {
      await e2g.table.setPageSize(25);
      await e2g.expectPosition(1, total, total);
      await expect(e2g.rows).toHaveCount(total);
      await expect(e2g.firstPageButton).toBeDisabled();
      await expect(e2g.previousPageButton).toBeDisabled();
      await expect(e2g.nextPageButton).toBeDisabled();
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

  test("Export downloads every prediction as JSON and TSV", async ({ page, testConfig }) => {
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

  test("the API query button opens the playground with this section's query", async ({
    page,
    testConfig,
  }) => {
    const e2g = await open(page, credibleSets(testConfig).primary);
    await e2g.expectApiQuery(operation);
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
    await expect(e2g.firstPageButton).toBeDisabled();
    await expect(e2g.previousPageButton).toBeDisabled();
    await expect(e2g.nextPageButton).toBeDisabled();
    await expect(e2g.description).toContainText(QTL_LEAD);
  });

  test("renders on both credible sets, as the manifest says", async ({ page, testConfig }) => {
    for (const id of Object.values(credibleSets(testConfig))) {
      await new CredibleSetPage(page).goToCredibleSetPage(id);
      await expectSections(page, expectedSectionsFor(id));
    }
  });
});
