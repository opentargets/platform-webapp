import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import {
  E2G_COLUMN,
  E2G_HEADERS,
  E2G_OPERATION,
  E2G_PAGE_SIZE,
  EnhancerToGenePredictionsSection,
} from "../../../POM/objects/widgets/shared/enhancerToGenePredictionsSection";
import { waitForOperation } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { VariantPage } from "../../../POM/page/variant/variant";
import { expectSectionLoaded, sectionLocator } from "../../../utils/sections";

/** APOE R176C (rs7412): 58 enhancer-to-gene predictions, for APOE and APOC1. */
const WITH_E2G = "19_44908822_C_T";
/** Intron variant overlapping IL6R: no predictions. */
const WITHOUT_E2G = "1_154453788_C_T";

type E2GRow = {
  target: { id: string; approvedSymbol: string } | null;
  biosample: { biosampleId: string; biosampleName: string } | null;
  intervalType: string;
  studyId: string;
  distanceToTss: number;
  chromosome: string;
  start: number;
  end: number;
  score: number;
};
type E2GData = { variant: { enhancerToGene: { count: number; rows: E2GRow[] } } };

const formatted = (value: number) => value.toLocaleString("en-US");
const ascending = (values: number[]) => [...values].sort((a, b) => a - b);
const descending = (values: number[]) => [...values].sort((a, b) => b - a);

/** Open the variant and wait for the section together with its first-page response. */
async function open(page: Page, variantId = WITH_E2G) {
  const response = waitForOperation<E2GData>(page, E2G_OPERATION);
  await new VariantPage(page).goToVariantPage(variantId);
  const { data, variables } = await response;
  const section = new EnhancerToGenePredictionsSection(page);
  await expectSectionLoaded(page, EnhancerToGenePredictionsSection.id);
  await section.table.expectRowCount(E2G_PAGE_SIZE);
  return { section, e2g: data.variant.enhancerToGene, variables };
}

test.describe("Variant page: Enhancer-to-gene predictions", () => {
  test("shows title, description, columns and the highest scoring predictions first", async ({
    page,
  }) => {
    const { section, e2g, variables } = await open(page);
    expect(e2g.count, "rs7412 has several pages of predictions").toBeGreaterThan(E2G_PAGE_SIZE);
    expect(e2g.rows).toHaveLength(E2G_PAGE_SIZE);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("Enhancer-to-gene predictions");
      await expect(section.description).toContainText(
        "Genes predicted to be regulated by enhancers overlapping"
      );
      await expect(section.description).toContainText(WITH_E2G);
      const source = section.description.getByRole("link", { name: "ENCODE rE2G" });
      await expect(source).toHaveAttribute("href", "https://doi.org/10.1101/2023.11.09.563812");
    });

    await test.step("exact column headers", async () => {
      await expect(section.table.headers).toHaveText([...E2G_HEADERS]);
    });

    await test.step("the first request asks for the best scores first", async () => {
      expect(variables.sort).toEqual([{ key: "SCORE", direction: "DESCENDING" }]);
      expect(variables.index).toBe(0);
      expect(variables.size).toBe(E2G_PAGE_SIZE);
    });

    await test.step("every row shows the API's values in the documented format", async () => {
      for (const [index, expected] of e2g.rows.entries()) {
        const cell = (column: keyof typeof E2G_COLUMN) =>
          section.table.cell(index, E2G_COLUMN[column]);
        await expect(section.geneLink(index)).toHaveText(expected.target?.approvedSymbol as string);
        await expect(cell("intervalType")).toHaveText(expected.intervalType);
        await expect(cell("distance")).toHaveText(formatted(expected.distanceToTss));
        await expect(cell("size")).toHaveText(formatted(expected.end - expected.start + 1));
        await expect(cell("range")).toHaveText(
          `${expected.chromosome}:${formatted(expected.start)}-${formatted(expected.end)}`
        );
        await expect(cell("score")).toHaveText(expected.score.toFixed(3));
        await expect(section.studyLink(index)).toHaveText(expected.studyId);
        await expect(section.biosampleLink(index)).toHaveText(
          (expected.biosample?.biosampleName ?? expected.biosample?.biosampleId) as string
        );
      }
    });

    await test.step("scores are between 0 and 1 and fall down the page", async () => {
      const scores = await section.numbers("score");
      expect(scores).toEqual(descending(scores));
      for (const score of scores) {
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(1);
      }
    });

    await test.step("the table has a search box, a page size and a column picker", async () => {
      await expect(section.table.searchInput).toBeVisible();
      await expect(section.table.pageSizeSelect).toHaveValue(String(E2G_PAGE_SIZE));
      await expect(section.table.columnsButton).toBeVisible();
    });
  });

  test("the gene links to that target's page, the study and tissue link to external records", async ({
    page,
  }) => {
    const { section, e2g } = await open(page);
    const [first] = e2g.rows;

    await expect(section.geneLink(0)).toHaveAttribute("href", `/target/${first.target?.id}`);
    await expect(section.studyLink(0)).toHaveAttribute(
      "href",
      `https://www.encodeproject.org/experiments/${first.studyId}/`
    );
    await expect(section.biosampleLink(0)).toHaveAttribute(
      "href",
      `https://www.ebi.ac.uk/ols4/search?q=${first.biosample?.biosampleId}`
    );
    await expect(section.biosampleLink(0)).toHaveAttribute("href", /^https:\/\/www\.ebi\.ac\.uk\//);
  });

  test("the gene link opens the page of the predicted target", async ({ page }) => {
    const { section, e2g } = await open(page);
    const target = e2g.rows[0].target as { id: string; approvedSymbol: string };
    await section.geneLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/target/${target.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(target.approvedSymbol);
  });

  test("the score header explains the score", async ({ page }) => {
    const { section } = await open(page);
    await section.table.headers.filter({ hasText: "Score" }).locator("sup, svg").first().hover();
    await expect(page.getByRole("tooltip")).toContainText(
      "This score (0-1) from E2G reflects the confidence that this genomic region regulates its target gene"
    );
  });

  test("pages through every prediction, first page again returns the start", async ({ page }) => {
    const { section, e2g } = await open(page);
    const table = section.table;
    const total = e2g.count;
    const lastPage = Math.ceil(total / E2G_PAGE_SIZE);
    const lastStart = (lastPage - 1) * E2G_PAGE_SIZE + 1;
    const firstPage = (await table.rows.allInnerTexts()).map((text) => text.trim());

    await table.expectPosition(`1 - ${E2G_PAGE_SIZE} of ${total}`, {
      canGoBack: false,
      canGoForward: true,
    });

    await test.step("the next page shows other predictions, with lower or equal scores", async () => {
      const lastScoreBefore = (await section.numbers("score")).at(-1) as number;
      await table.nextPageButton.click();
      await expect(table.position).toHaveText(
        `${E2G_PAGE_SIZE + 1} - ${2 * E2G_PAGE_SIZE} of ${total}`
      );
      await expect
        .poll(async () => (await table.rows.allInnerTexts()).map((text) => text.trim()))
        .not.toEqual(firstPage);
      const scores = await section.numbers("score");
      expect(scores[0]).toBeLessThanOrEqual(lastScoreBefore);
      expect(scores).toEqual(descending(scores));
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.previousPageButton).toBeEnabled();
    });

    await test.step("the last page holds the remainder and disables forward navigation", async () => {
      await table.lastPageButton.click();
      await table.expectPosition(`${lastStart} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await table.expectRowCount(total - lastStart + 1);
    });

    await test.step("previous page and first page go back", async () => {
      await table.previousPageButton.click();
      await expect(table.position).toHaveText(
        `${lastStart - E2G_PAGE_SIZE} - ${lastStart - 1} of ${total}`
      );
      await table.firstPageButton.click();
      await table.expectPosition(`1 - ${E2G_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect
        .poll(async () => (await table.rows.allInnerTexts()).map((text) => text.trim()))
        .toEqual(firstPage);
    });
  });

  test("a larger page size shows more predictions on one page", async ({ page }) => {
    const { section, e2g } = await open(page);
    await section.table.pageSizeSelect.selectOption("25");
    await expect(section.table.pageSizeSelect).toHaveValue("25");
    await section.table.expectRowCount(25);
    await section.table.expectPosition(`1 - 25 of ${e2g.count}`, {
      canGoBack: false,
      canGoForward: true,
    });
    await section.table.pageSizeSelect.selectOption("100");
    await section.table.expectRowCount(e2g.count);
    await section.table.expectPosition(`1 - ${e2g.count} of ${e2g.count}`, {
      canGoBack: false,
      canGoForward: false,
    });
  });

  test("search runs on the server over gene, tissue, interval type and study", async ({ page }) => {
    const { section, e2g } = await open(page);
    const table = section.table;
    const total = e2g.count;

    await test.step("a gene symbol leaves only that gene's predictions", async () => {
      const searched = page.waitForRequest((request) => {
        const body = request.postDataJSON?.() as {
          operationName?: string;
          variables?: { search?: { text?: string } };
        } | null;
        return body?.operationName === E2G_OPERATION && body.variables?.search?.text === "APOC1";
      });
      await table.search("APOC1");
      const request = await searched;
      const { fields } = (request.postDataJSON() as { variables: { search: { fields: string[] } } })
        .variables.search;
      expect(fields.sort()).toEqual([
        "BIOSAMPLE_ID",
        "BIOSAMPLE_NAME",
        "INTERVAL_TYPE",
        "STUDY_ID",
        "TARGET_APPROVED_SYMBOL",
      ]);
      await expect(table.position).toHaveText(/^1 - \d+ of \d+$/);
      await expect(table.position).not.toHaveText(new RegExp(`of ${total}$`));
      const matches = Number((await table.position.innerText()).split(" of ")[1]);
      expect(matches, "rs7412 has predictions for APOC1").toBeGreaterThan(0);
      await table.expectRowCount(Math.min(matches, E2G_PAGE_SIZE));
      for (const gene of await table.columnTexts(E2G_COLUMN.gene)) expect(gene).toBe("APOC1");
    });

    await test.step("a tissue name leaves only predictions in that tissue", async () => {
      await table.search("kidney");
      await expect(table.position).toHaveText(/^1 - \d+ of \d+$/);
      await expect(table.position).not.toHaveText(new RegExp(`of ${total}$`));
      await expect
        .poll(async () => table.columnTexts(E2G_COLUMN.biosample))
        .toEqual(expect.arrayContaining(["kidney"]));
      for (const tissue of await table.columnTexts(E2G_COLUMN.biosample)) {
        expect(tissue.toLowerCase()).toContain("kidney");
      }
    });

    await test.step("a term with no match shows no rows and a total of 0", async () => {
      await table.search("zzz-no-such-prediction");
      await table.expectRowCount(0);
      await expect(table.position).toHaveText(/ of 0$/);
    });

    await test.step("clearing the search restores the full list", async () => {
      await table.search("");
      await table.expectRowCount(E2G_PAGE_SIZE);
      await table.expectPosition(`1 - ${E2G_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
    });
  });

  test("sorting by score reverses the order on the server", async ({ page }) => {
    const { section, e2g } = await open(page);
    const total = e2g.count;
    const best = e2g.rows[0].score.toFixed(3);

    const sorted = waitForOperation<E2GData>(page, E2G_OPERATION);
    await section.sortLabel("Score").click();
    const { variables } = await sorted;
    expect(variables.sort).toEqual([{ key: "SCORE", direction: "ASCENDING" }]);

    await expect
      .poll(async () => {
        const scores = await section.numbers("score");
        return scores.length === E2G_PAGE_SIZE && scores.join() === ascending(scores).join();
      })
      .toBe(true);
    const scores = await section.numbers("score");
    expect(scores[0], "the lowest score of all predictions comes first").toBeLessThan(Number(best));
    await section.table.expectPosition(`1 - ${E2G_PAGE_SIZE} of ${total}`, {
      canGoBack: false,
      canGoForward: true,
    });
  });

  test("sorting by distance and by interval size orders the whole list, a second click reverses it", async ({
    page,
  }) => {
    const { section } = await open(page);

    for (const [header, column, key] of [
      ["Distance from start site (bp)", "distance", "DISTANCE_TO_TSS"],
      ["Interval size (bp)", "size", "INTERVAL_SIZE"],
    ] as const) {
      const sortRequest = (direction?: string) =>
        page.waitForRequest((request) => {
          const body = request.postDataJSON?.() as {
            operationName?: string;
            variables?: { sort?: { key: string; direction: string }[] };
          } | null;
          const sort = body?.variables?.sort?.[0];
          return (
            body?.operationName === E2G_OPERATION &&
            sort?.key === key &&
            (direction === undefined || sort.direction === direction)
          );
        });
      const orderOf = async (direction: string) => {
        const values = await section.numbers(column);
        const expected = direction === "ASCENDING" ? ascending(values) : descending(values);
        return values.length === E2G_PAGE_SIZE && values.join() === expected.join();
      };

      const first = sortRequest();
      await section.sortLabel(header).click();
      const firstDirection = (
        (await first).postDataJSON() as { variables: { sort: { direction: string }[] } }
      ).variables.sort[0].direction;
      expect(["ASCENDING", "DESCENDING"]).toContain(firstDirection);
      await expect
        .poll(() => orderOf(firstDirection), { message: `${header} follows the requested order` })
        .toBe(true);

      const reversed = firstDirection === "ASCENDING" ? "DESCENDING" : "ASCENDING";
      const second = sortRequest(reversed);
      await section.sortLabel(header).click();
      await second;
      await expect
        .poll(() => orderOf(reversed), { message: `${header} reverses after a second click` })
        .toBe(true);
    }
  });

  test("only interval type, distance, interval size and score offer sorting", async ({ page }) => {
    const { section } = await open(page);
    for (const header of ["Gene", "Affected tissue/cell", "Study", "Interval range"]) {
      await expect(section.sortArrows(header), `${header} is not sortable`).toHaveCount(0);
    }
    for (const header of ["Interval type", "Distance from start site (bp)", "Interval size (bp)"]) {
      await expect(section.sortArrows(header), `${header} is sortable`).toHaveCount(1);
    }
    await expect(section.sortArrows("Score"), "Score is the sorted column").toHaveCount(1);
    await expect(section.sortArrows("Score")).toHaveAttribute("data-icon", "arrow-down");
  });

  test("the column picker hides and shows columns, gene and tissue cannot be hidden", async ({
    page,
  }) => {
    const { section } = await open(page);
    const list = await section.table.openColumnPicker();
    await expect(list.getByRole("checkbox", { name: "Gene" })).toBeDisabled();
    await expect(list.getByRole("checkbox", { name: "Affected tissue/cell" })).toBeDisabled();

    await list.getByRole("checkbox", { name: "Study" }).uncheck();
    await expect(section.table.headers.filter({ hasText: "Study" })).toHaveCount(0);
    await expect(section.table.headers).toHaveCount(E2G_HEADERS.length - 1);

    await list.getByRole("checkbox", { name: "Study" }).check();
    await expect(section.table.headers).toHaveText([...E2G_HEADERS]);
  });

  test("the export offers JSON and TSV with the section's columns", async ({ page }) => {
    const { section } = await open(page);

    const json = await section.controls.downloadJson();
    expect(json.filename).toBe(`${WITH_E2G}-enhancer-to-gene-predictions.json`);
    expect(json.rows.length).toBeGreaterThanOrEqual(E2G_PAGE_SIZE);
    expect(JSON.stringify(json.rows[0])).toContain("APOE");

    const tsv = await section.controls.downloadTsv();
    expect(tsv.filename).toBe(`${WITH_E2G}-enhancer-to-gene-predictions.tsv`);
    expect(tsv.header).toEqual([
      "gene",
      "affectedTissueCell",
      "intervalType",
      "study",
      "distanceFromStartSiteBp",
      "intervalSizeBp",
      "intervalRange",
      "score",
    ]);
    expect(tsv.lines.filter((line) => line.join("").length > 0).length).toBe(json.rows.length);
  });

  test("the API query drawer is loaded with the section's query and variant", async ({ page }) => {
    const { section } = await open(page);
    await section.controls.openApiQuery(E2G_OPERATION, WITH_E2G);
    await section.controls.closeApiQuery();
  });

  test("a variant without predictions has no enhancer-to-gene section", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(WITHOUT_E2G);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(sectionLocator(page, EnhancerToGenePredictionsSection.id)).toHaveCount(0);
  });
});
