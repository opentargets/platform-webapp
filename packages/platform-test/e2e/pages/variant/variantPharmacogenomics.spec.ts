import type { Page } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import {
  PGX_COLUMN,
  PGX_HEADERS,
  PGX_OPERATION,
  PGX_PAGE_SIZE,
  PharmacogenomicsSection,
} from "../../../POM/objects/widgets/shared/pharmacogenomicsSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../POM/objects/widgets/shared/sectionDataControls";
import { VariantPage } from "../../../POM/page/variant/variant";
import { expectSectionLoaded, sectionLocator } from "../../../utils/sections";

/** PON1 variant: 20 rows, evidence levels 3 and 4, no strong evidence. */
const PON1 = "7_95308134_T_C";
/** APOE R176C (rs7412): 20 rows, evidence levels 2B and 3. */
const APOE = "19_44908822_C_T";
/** Intron variant overlapping IL6R: no pharmacogenetics. */
const NONE = "1_154453788_C_T";

type PgxRow = {
  genotypeId: string;
  isDirectTarget: boolean;
  target: { id: string; approvedSymbol: string } | null;
  drugs: { drugFromSource: string | null; drugId: string | null }[];
  phenotypeText: string | null;
  pgxCategory: string | null;
  evidenceLevel: string | null;
  studyId: string | null;
  literature: string[] | null;
  variantAnnotation: { directionality: string | null }[] | null;
  genotypeAnnotationText: string | null;
};
type PgxData = { variant: { pharmacogenomics: { count: number; rows: PgxRow[] } } };

/** ClinPGx confidence levels, strongest first. */
const LEVELS = ["1A", "1B", "2A", "2B", "3", "4"];
const rank = (text: string) => LEVELS.indexOf(text.replace(/^Level\s+/, "").trim());

/** Open a variant and wait for the section together with its first-page response. */
async function open(page: Page, variantId: string) {
  await stubEuropePmc(page);
  const response = waitForOperation<PgxData>(page, PGX_OPERATION);
  await new VariantPage(page).goToVariantPage(variantId);
  const { data, variables } = await response;
  const section = new PharmacogenomicsSection(page);
  await expectSectionLoaded(page, PharmacogenomicsSection.id);
  await section.table.expectRowCount(PGX_PAGE_SIZE);
  return { section, pgx: data.variant.pharmacogenomics, variables };
}

async function levelRanks(section: PharmacogenomicsSection): Promise<number[]> {
  return (await section.table.columnTexts(PGX_COLUMN.level)).map(rank);
}

test.describe("Variant page: Pharmacogenetics", () => {
  test("shows title, description, columns and the strongest evidence first", async ({ page }) => {
    const { section, pgx, variables } = await open(page, APOE);
    expect(pgx.count, "rs7412 has two pages of pharmacogenetics").toBeGreaterThan(PGX_PAGE_SIZE);

    await test.step("title and description", async () => {
      await expect(section.title).toHaveText("Pharmacogenetics");
      await expect(section.description).toContainText("Genotypes in");
      await expect(section.description).toContainText(APOE);
      await expect(section.description).toContainText("known to affect drug response. Source: ClinPGx");
      await expect(section.description.getByRole("link", { name: "ClinPGx" })).toHaveAttribute(
        "href",
        "https://www.pharmgkb.org/"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(section.table.headers).toHaveText([...PGX_HEADERS]);
    });

    await test.step("the first request asks for the strongest evidence first", async () => {
      expect(variables.sort).toEqual([{ key: "EVIDENCE_LEVEL", direction: "ASCENDING" }]);
      expect(variables.index).toBe(0);
      expect(variables.size).toBe(PGX_PAGE_SIZE);
    });

    await test.step("levels are ClinPGx levels, ordered strongest first", async () => {
      for (const text of await section.table.columnTexts(PGX_COLUMN.level)) {
        expect(text).toMatch(/^Level (1A|1B|2A|2B|3|4)$/);
      }
      const ranks = await levelRanks(section);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
      await expect(section.level(0)).toHaveText(`Level ${pgx.rows[0].evidenceLevel}`);
    });

    await test.step("the table has a search box, a page size and a column picker", async () => {
      await expect(section.table.searchInput).toBeVisible();
      await expect(section.table.pageSizeSelect).toHaveValue(String(PGX_PAGE_SIZE));
      await expect(section.table.columnsButton).toBeVisible();
    });
  });

  test("every row shows the API's genotype, drugs, phenotype, category, gene and source", async ({
    page,
  }) => {
    const { section, pgx } = await open(page, PON1);
    for (const [index, expected] of pgx.rows.entries()) {
      const cell = (column: keyof typeof PGX_COLUMN) => section.table.cell(index, PGX_COLUMN[column]);
      await expect(cell("genotype")).toContainText(expected.genotypeId);
      await expect(cell("genotype")).toHaveText(/^\d+_\d+_[ACGT]+_[ACGT]+,[ACGT]+/);

      const drugs = expected.drugs.filter((drug) => drug.drugId || drug.drugFromSource);
      await expect(section.drugLinks(index)).toHaveCount(drugs.length);
      for (const [position, drug] of drugs.entries()) {
        await expect(section.drugLinks(index).nth(position)).toHaveText(
          (drug.drugFromSource ?? drug.drugId ?? "").toUpperCase()
        );
        await expect(section.drugLinks(index).nth(position)).toHaveAttribute(
          "href",
          `/drug/${drug.drugId}`
        );
      }

      await expect(cell("phenotype")).toContainText(expected.phenotypeText as string);
      await expect(cell("category")).toHaveText(expected.pgxCategory as string);
      await expect(section.geneLink(index)).toHaveText("PON1");
      await expect(section.geneLink(index)).toHaveAttribute("href", `/target/${expected.target?.id}`);
      await expect(section.level(index)).toHaveText(`Level ${expected.evidenceLevel}`);
      await expect(section.sourceLink(index)).toHaveText("ClinPGx");
      await expect(section.sourceLink(index)).toHaveAttribute(
        "href",
        `https://www.pharmgkb.org/clinicalAnnotation/${expected.studyId}`
      );
    }
  });

  test("the direct drug target column shows a check for direct targets and a cross otherwise", async ({
    page,
  }) => {
    const { section, pgx } = await open(page, PON1);
    for (const [index, expected] of pgx.rows.entries()) {
      const icon = section.table.cell(index, PGX_COLUMN.directTarget).locator("svg");
      await expect(icon).toHaveCount(1);
      await expect(icon).toHaveAttribute(
        "data-icon",
        expected.isDirectTarget ? "circle-check" : "circle-xmark"
      );
    }
  });

  test("the drug links open the page of that drug", async ({ page }) => {
    const { section, pgx } = await open(page, PON1);
    const drug = pgx.rows[0].drugs[0];
    await section.drugLinks(0).first().click();
    await expect(page).toHaveURL(new RegExp(`/drug/${drug.drugId}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("the gene link opens the page of the target", async ({ page }) => {
    const { section, pgx } = await open(page, PON1);
    await section.geneLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/target/${pgx.rows[0].target?.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText("PON1");
  });

  test("a drug without a ChEMBL id is shown in capitals as plain text, the others link to their drug", async ({
    page,
  }) => {
    const { section, pgx } = await open(page, APOE);
    const unlinked = pgx.rows.findIndex((row) => row.drugs.some((drug) => !drug.drugId));
    expect(unlinked, "the first page holds a drug without a ChEMBL id").toBeGreaterThanOrEqual(0);
    const drug = pgx.rows[unlinked].drugs.find((candidate) => !candidate.drugId);
    const cell = section.table.cell(unlinked, PGX_COLUMN.drugs);
    await expect(cell).toHaveText((drug?.drugFromSource as string).toUpperCase());
    await expect(section.drugLinks(unlinked)).toHaveCount(0);

    const linked = pgx.rows.findIndex((row) => row.drugs.every((candidate) => candidate.drugId));
    await expect(section.drugLinks(linked)).toHaveCount(pgx.rows[linked].drugs.length);
  });

  test("the genotype and confidence headers explain themselves", async ({ page }) => {
    const { section } = await open(page, APOE);

    await section.table.headers.filter({ hasText: "Genotype ID" }).locator("sup, svg").first().hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("VCF-style(chr_pos_ref_allele1,allele2)");
    await expect(tooltip.getByRole("link", { name: "here" })).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/apriltuesday\/opentargets-pharmgkb/
    );
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();

    await section.table.headers.filter({ hasText: "Confidence level" }).locator("sup, svg").first().hover();
    await expect(tooltip).toContainText("As defined by");
    await expect(tooltip.getByRole("link", { name: "ClinPGx ClinAnn Levels" })).toHaveAttribute(
      "href",
      "https://www.pharmgkb.org/page/clinAnnLevels"
    );
  });

  test("the phenotype tooltip carries the full genotype annotation", async ({ page }) => {
    const { section, pgx } = await open(page, PON1);
    const annotation = pgx.rows[0].genotypeAnnotationText as string;
    expect(annotation.length).toBeGreaterThan(20);
    await section.table.cell(0, PGX_COLUMN.phenotype).locator("sup, svg").first().hover();
    await expect(page.getByRole("tooltip")).toContainText(annotation);
  });

  test("is sorted by confidence on the server, and the header reverses the order", async ({
    page,
  }) => {
    const { section, pgx } = await open(page, PON1);
    const total = pgx.count;
    const ascending = await levelRanks(section);
    expect(ascending[0]).toBe(rank("3"));

    const sorted = waitForOperation<PgxData>(page, PGX_OPERATION);
    await section.sortLabel("Confidence level").click();
    const { variables } = await sorted;
    expect(variables.sort).toEqual([{ key: "EVIDENCE_LEVEL", direction: "DESCENDING" }]);

    await expect
      .poll(async () => (await levelRanks(section))[0], { message: "weakest evidence comes first" })
      .toBe(rank("4"));
    const ranks = await levelRanks(section);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    await section.table.expectPosition(`1 - ${PGX_PAGE_SIZE} of ${total}`, {
      canGoBack: false,
      canGoForward: true,
    });

    await test.step("no other column offers sorting", async () => {
      await expect(section.table.headers.locator("svg[data-icon^='arrow-']")).toHaveCount(1);
      await expect(section.sortArrows("Confidence level")).toHaveAttribute("data-icon", "arrow-down");
    });
  });

  test("pages through every row, the last page holds the remainder", async ({ page }) => {
    const { section, pgx } = await open(page, PON1);
    const table = section.table;
    const total = pgx.count;
    const firstPage = await table.rows.allInnerTexts();
    await table.expectPosition(`1 - ${PGX_PAGE_SIZE} of ${total}`, {
      canGoBack: false,
      canGoForward: true,
    });

    await test.step("the next page shows other rows, with equal or weaker evidence", async () => {
      const before = (await levelRanks(section)).at(-1) as number;
      await table.nextPageButton.click();
      await expect(table.position).toHaveText(
        `${PGX_PAGE_SIZE + 1} - ${Math.min(2 * PGX_PAGE_SIZE, total)} of ${total}`
      );
      await expect.poll(async () => table.rows.allInnerTexts()).not.toEqual(firstPage);
      expect((await levelRanks(section))[0]).toBeGreaterThanOrEqual(before);
    });

    await test.step("the last page disables forward navigation", async () => {
      await table.lastPageButton.click();
      const lastStart = Math.floor((total - 1) / PGX_PAGE_SIZE) * PGX_PAGE_SIZE + 1;
      await table.expectPosition(`${lastStart} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await table.expectRowCount(total - lastStart + 1);
    });

    await test.step("the first page returns the start", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(`1 - ${PGX_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect.poll(async () => table.rows.allInnerTexts()).toEqual(firstPage);
    });
  });

  test("a larger page size shows every row on one page", async ({ page }) => {
    const { section, pgx } = await open(page, PON1);
    await section.table.pageSizeSelect.selectOption("25");
    await expect(section.table.pageSizeSelect).toHaveValue("25");
    await section.table.expectRowCount(pgx.count);
    await section.table.expectPosition(`1 - ${pgx.count} of ${pgx.count}`, {
      canGoBack: false,
      canGoForward: false,
    });
  });

  test("search runs on the server over drug, gene, genotype, phenotype and category", async ({
    page,
  }) => {
    const { section, pgx } = await open(page, PON1);
    const table = section.table;
    const total = pgx.count;

    await test.step("a drug name leaves only that drug's rows", async () => {
      const searched = page.waitForRequest((request) => {
        const body = request.postDataJSON?.() as {
          operationName?: string;
          variables?: { search?: { text?: string } };
        } | null;
        return body?.operationName === PGX_OPERATION && body.variables?.search?.text === "clopidogrel";
      });
      await table.search("clopidogrel");
      const request = await searched;
      const { fields } = (
        request.postDataJSON() as { variables: { search: { fields: string[] } } }
      ).variables.search;
      expect([...fields].sort()).toEqual([
        "DRUG_FROM_SOURCES",
        "DRUG_IDS",
        "EVIDENCE_LEVEL",
        "GENOTYPE_ANNOTATION_TEXT",
        "GENOTYPE_ID",
        "PGX_CATEGORY",
        "PHENOTYPE_TEXT",
        "TARGET_APPROVED_SYMBOL",
      ]);
      await expect(table.position).toHaveText(/^1 - \d+ of \d+$/);
      await expect(table.position).not.toHaveText(new RegExp(`of ${total}$`));
      const matches = Number((await table.position.innerText()).split(" of ")[1]);
      await table.expectRowCount(Math.min(matches, PGX_PAGE_SIZE));
      for (const drugs of await table.columnTexts(PGX_COLUMN.drugs)) {
        expect(drugs).toBe("CLOPIDOGREL");
      }
    });

    await test.step("a category leaves only rows of that category", async () => {
      await table.search("toxicity");
      await expect(table.position).toHaveText(/^1 - \d+ of \d+$/);
      await expect
        .poll(async () => {
          const categories = await table.columnTexts(PGX_COLUMN.category);
          return categories.length > 0 && categories.every((category) => category === "toxicity");
        })
        .toBe(true);
    });

    await test.step("a term with no match shows no rows and a total of 0", async () => {
      await table.search("zzz-no-such-drug");
      await table.expectRowCount(0);
      await expect(table.position).toHaveText(/ of 0$/);
    });

    await test.step("clearing the search restores the list", async () => {
      await table.search("");
      await table.expectRowCount(PGX_PAGE_SIZE);
      await table.expectPosition(`1 - ${PGX_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
    });
  });

  test("the column picker hides and shows columns, the first column cannot be hidden", async ({
    page,
  }) => {
    const { section } = await open(page, PON1);
    const list = await section.table.openColumnPicker();
    await expect(list.getByRole("checkbox", { name: "Genotype ID" })).toBeDisabled();

    await list.getByRole("checkbox", { name: "Source" }).uncheck();
    await expect(section.table.headers.filter({ hasText: "Source" })).toHaveCount(0);
    await expect(section.table.headers).toHaveCount(PGX_HEADERS.length - 1);

    await list.getByRole("checkbox", { name: "Source" }).check();
    await expect(section.table.headers).toHaveText([...PGX_HEADERS]);
  });

  test("directionality opens a drawer with the entries of that row", async ({ page }) => {
    const { section, pgx } = await open(page, APOE);
    const index = pgx.rows.findIndex((row) => (row.variantAnnotation ?? []).length > 1);
    expect(index, "the first page holds a row with several annotations").toBeGreaterThanOrEqual(0);
    const entries = (pgx.rows[index].variantAnnotation ?? []).length;

    const cell = section.table.cell(index, PGX_COLUMN.directionality);
    await expect(cell.getByTestId("directionality-drawer-trigger")).toHaveText(`${entries} entries`);
    const withoutAnnotations = pgx.rows.findIndex((row) => (row.variantAnnotation ?? []).length === 0);
    expect(withoutAnnotations).toBeGreaterThanOrEqual(0);
    await expect(section.table.cell(withoutAnnotations, PGX_COLUMN.directionality)).toHaveText("N/A");

    await cell.getByTestId("directionality-drawer-trigger").click();
    const drawer = page.getByTestId("directionality-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Directionality");
    await expect(drawer.getByTestId("ot-table").locator("tbody tr")).toHaveCount(entries);
    await expect(drawer.getByTestId("ot-table").locator("tbody tr").first()).toContainText(
      /Description:\s*\S+/
    );
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("literature opens the publications of that row", async ({ page }) => {
    const { section, pgx } = await open(page, PON1);
    const index = pgx.rows.findIndex((row) => (row.literature ?? []).length > 1);
    expect(index, "the first page holds a row with several publications").toBeGreaterThanOrEqual(0);
    const literature = pgx.rows[index].literature as string[];

    const trigger = section.table.cell(index, PGX_COLUMN.literature).getByTestId("publications-drawer-trigger");
    await expect(trigger).toHaveText(`${literature.length} publications`);
    await trigger.click();
    const drawer = page.getByTestId("publications-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Loading Europe PMC search results")).toHaveCount(0);
    for (const id of literature.slice(0, 10)) {
      await expect(drawer.getByTestId(`literature-entry-${id}`)).toBeVisible();
    }
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("the export offers JSON and TSV with the section's rows", async ({ page }) => {
    const { section, pgx } = await open(page, PON1);

    const json = await section.controls.downloadJson();
    expect(json.filename).toBe(`${PON1}-pharmacogenetics-variant.json`);
    expect(json.rows).toHaveLength(pgx.count);
    expect(JSON.stringify(json.rows)).toContain("CLOPIDOGREL");

    const tsv = await section.controls.downloadTsv();
    expect(tsv.filename).toBe(`${PON1}-pharmacogenetics-variant.tsv`);
    expect(tsv.header).toEqual([
      "genotypeId",
      "drugs",
      "drugResponsePhenotype",
      "drugResponseCategory",
      "gene",
      "directionality",
      "directDrugTarget",
      "confidenceLevel",
      "source",
      "literature",
    ]);
    expect(tsv.lines.filter((line) => line.join("").length > 0)).toHaveLength(pgx.count);
  });

  test("the API query drawer is loaded with the section's query and variant", async ({ page }) => {
    const { section } = await open(page, PON1);
    await section.controls.openApiQuery(PGX_OPERATION, PON1);
    await section.controls.closeApiQuery();
  });

  test("a variant without pharmacogenetics has no pharmacogenetics section", async ({ page }) => {
    await new VariantPage(page).goToVariantPage(NONE);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(sectionLocator(page, PharmacogenomicsSection.id)).toHaveCount(0);
  });
});
