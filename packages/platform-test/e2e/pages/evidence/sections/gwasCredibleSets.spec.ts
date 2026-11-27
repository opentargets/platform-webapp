import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  EVIDENCE_GWAS_HEADERS,
  EVIDENCE_GWAS_OPERATION,
  EVIDENCE_GWAS_PAGE_SIZE,
  EvidenceGwasCredibleSetsSection,
  type EvidenceGwasData,
  type EvidenceGwasRow,
} from "../../../../POM/objects/widgets/Evidence/gwasCredibleSets";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { PublicationsDrawer } from "../../../../POM/objects/widgets/Target/publicationsDrawer";
import { EvidencePage } from "../../../../POM/page/evidence/evidence";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

/** IL6R in myocardial infarction: five GWAS credible sets, one page. */
const FEW = { ensgId: "ENSG00000160712", efoId: "MONDO_0005068" };
/** PCSK9 in LDL cholesterol measurement: more than 600 credible sets. */
const MANY = { ensgId: "ENSG00000169174", efoId: "EFO_0004611" };
/** BRAF in melanoma: no GWAS credible set evidence. */
const NONE = { ensgId: "ENSG00000157764", efoId: "MONDO_0005105" };

type Pair = { ensgId: string; efoId: string };

/** Open an evidence page and wait for the GWAS section together with its first-page response. */
async function open(page: Page, pair: Pair) {
  const response = waitForOperation<EvidenceGwasData>(page, EVIDENCE_GWAS_OPERATION);
  await new EvidencePage(page).goto(pair.ensgId, pair.efoId);
  const { data, variables } = await response;
  expect(variables.sort, "the first page is sorted by L2G score, highest first").toEqual([
    { key: "SCORE", direction: "DESCENDING" },
  ]);
  const section = new EvidenceGwasCredibleSetsSection(page);
  await expectSectionLoaded(page, EvidenceGwasCredibleSetsSection.id);
  return { section, data, evidences: data.disease.evidenceViews.gwasCredibleSets };
}

const NA = "N/A";
const scientific = (mantissa: number | null, exponent: number | null) =>
  typeof mantissa === "number" && typeof exponent === "number"
    ? `${mantissa.toFixed(3)}×10${exponent}`
    : NA;
const CONFIDENCE_LABELS: Record<number, string> = {
  4: "SuSiE fine-mapped credible set with in-sample LD",
  3: "SuSiE fine-mapped credible set with out-of-sample LD",
  2: "PICS fine-mapped credible set extracted from summary statistics",
  1: "PICS fine-mapped credible set based on reported top hit",
  0: "Unknown confidence",
};
const METHOD_LABELS: Record<string, string> = {
  PICS: "PICS",
  SUSIE: "SuSiE",
  SUSIE_INF: "SuSiE-inf",
};

/** Assert the cells of one rendered row against the API record it was built from. */
async function expectRow(
  section: EvidenceGwasCredibleSetsSection,
  index: number,
  row: EvidenceGwasRow
) {
  await expect(section.credibleSetLink(index)).toHaveText("View");
  await expect(section.credibleSetLink(index)).toHaveAttribute(
    "href",
    `/credible-set/${row.credibleSetId}`
  );
  if (row.leadVariantId) {
    await expect(section.leadVariantLink(index)).toHaveAttribute(
      "href",
      `/variant/${row.leadVariantId}`
    );
  } else {
    await expect(section.cell(index, "leadVariant")).toHaveText(NA);
  }
  await expect(section.cell(index, "trait")).toHaveText(row.traitFromSource ?? "");
  await expect(section.diseaseLink(index)).toHaveText(row.diseaseName);
  await expect(section.diseaseLink(index)).toHaveAttribute("href", `/disease/${row.diseaseId}`);
  await expect(section.studyLink(index)).toHaveText(row.studyId);
  await expect(section.studyLink(index)).toHaveAttribute("href", `/study/${row.studyId}`);
  await expect(section.cell(index, "sampleSize")).toHaveText(
    row.nSamples ? row.nSamples.toLocaleString("en-US") : NA
  );
  await expect(section.cell(index, "pValue")).toHaveText(
    scientific(row.pValueMantissa, row.pValueExponent)
  );
  await expect(section.cell(index, "beta")).toHaveText(row.beta ? row.beta.toFixed(3) : NA);
  if (row.confidence) {
    await expect(section.stars(index)).toHaveCount(4);
    await expect(section.filledStars(index)).toHaveCount(row.confidence);
  } else {
    await expect(section.cell(index, "confidence")).toHaveText(NA);
  }
  await expect(section.cell(index, "method")).toHaveText(
    row.fineMappingMethod ? (METHOD_LABELS[row.fineMappingMethod] ?? row.fineMappingMethod) : NA
  );
  await expect(section.cell(index, "l2gScore")).toHaveText(row.score ? row.score.toFixed(3) : NA);
  const { publicationFirstAuthor, publicationDate } = row;
  await expect(section.cell(index, "publication")).toHaveText(
    publicationFirstAuthor
      ? `${publicationFirstAuthor} et al. (${new Date(publicationDate as string).getFullYear()})`
      : NA
  );
}

test.describe("Evidence page: GWAS credible sets", () => {
  // The evidence page mounts a Europe PMC section and the publication drawers query it. It is
  // a throttled third-party service, so it is stubbed: the tests depend only on the app and API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description and every credible set of a pair with few records @smoke", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    expect(
      evidences.count,
      "IL6R has a handful of GWAS credible sets for myocardial infarction"
    ).toBe(evidences.rows.length);
    expect(evidences.count).toBeGreaterThan(1);
    expect(evidences.count).toBeLessThan(EVIDENCE_GWAS_PAGE_SIZE);

    await test.step("title and description name the target and the disease", async () => {
      await expect(section.title).toContainText("GWAS associations");
      await expect(section.description).toHaveText(
        "95% GWAS credible sets prioritising IL6R as likely causal gene for myocardial infarction. Source: Open Targets"
      );
      await expect(section.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/evidence#gwas-associations"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(section.table.headers).toHaveText([...EVIDENCE_GWAS_HEADERS]);
    });

    await test.step("one row per credible set, ordered by L2G score, highest first", async () => {
      await section.table.expectRowCount(evidences.count);
      const scores = evidences.rows.map((row) => row.score ?? 0);
      expect(scores, "the API returns the strongest prioritisation first").toEqual(
        [...scores].sort((a, b) => b - a)
      );
      for (const [index, row] of evidences.rows.entries()) await expectRow(section, index, row);
    });

    await test.step("one page: the footer reports the total and nothing can be paged", async () => {
      await section.table.expectPosition(`1 - ${evidences.count} of ${evidences.count}`, {
        canGoBack: false,
        canGoForward: false,
      });
      await expect(section.table.searchInput).toBeVisible();
      await expect(section.table.pageSizeSelect).toHaveValue("10");
      await expect(section.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
    });
  });

  test("the search box filters the credible sets on the server and shows the matches", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, MANY);
    await expect(section.table.searchInput).toBeVisible();
    const term = evidences.rows[0].studyId;

    const searched = page.waitForResponse((response) => {
      const body = response.request().postData() ?? "";
      return body.includes(EVIDENCE_GWAS_OPERATION) && body.includes(`"text":"${term}"`);
    });
    await section.table.search(term);
    const body = (await (await searched).json()) as { data: EvidenceGwasData };
    const found = body.data.disease.evidenceViews.gwasCredibleSets;
    expect(found.count, "the search narrows the credible sets").toBeLessThan(evidences.count);
    expect(found.count).toBeGreaterThan(0);
    expect(found.rows.every((row) => row.studyId === term)).toBe(true);

    await section.table.expectRowCount(Math.min(found.count, EVIDENCE_GWAS_PAGE_SIZE));
    await expect(section.table.position).toHaveText(
      `1 - ${Math.min(found.count, EVIDENCE_GWAS_PAGE_SIZE)} of ${found.count}`
    );
    for (const [index, row] of found.rows.entries()) await expectRow(section, index, row);
  });

  test("the header tooltips explain the fine-mapping confidence and the L2G score", async ({
    page,
  }) => {
    const { section } = await open(page, FEW);
    const tooltip = page.getByRole("tooltip");

    await section.headerHelp("Fine-mapping confidence").hover();
    await expect(tooltip).toContainText(
      "Fine-mapping confidence based on the quality of the linkage-disequilibrium information available and fine-mapping method"
    );
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();

    await section.headerHelp("L2G score").hover();
    await expect(tooltip).toContainText(
      "Machine learning prediction linking a gene to a credible set"
    );
    await expect(tooltip).toContainText("Score range [0,1]");
    await expect(tooltip.getByRole("link", { name: "our documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/gentropy/locus-to-gene-l2g"
    );
  });

  test("the fine-mapping confidence stars explain the confidence level in a tooltip", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    // Rows with different confidences show different numbers of filled stars.
    const levels = new Set(evidences.rows.map((row) => row.confidence));
    expect(
      levels.size,
      "the pair has credible sets of more than one confidence level"
    ).toBeGreaterThan(1);

    for (const [index, row] of evidences.rows.entries()) {
      await section.stars(index).first().hover();
      await expect(page.getByRole("tooltip")).toHaveText(
        CONFIDENCE_LABELS[row.confidence as number]
      );
      await page.mouse.move(0, 0);
      await expect(page.getByRole("tooltip")).toBeHidden();
    }
  });

  test("the View link opens the credible set page of that row", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    const { credibleSetId } = evidences.rows[0];
    await section.credibleSetLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/credible-set/${credibleSetId}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("the study link opens the study page of that row", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    const { studyId: id } = evidences.rows[0];
    await section.studyLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/study/${id}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("the disease link opens the disease page, and back returns to the evidence page", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    const { diseaseId: id } = evidences.rows[0];
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${id}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/evidence/${FEW.ensgId}/${FEW.efoId}(#.*)?$`));
    await expectSectionLoaded(page, EvidenceGwasCredibleSetsSection.id);
    await new EvidenceGwasCredibleSetsSection(page).table.expectRowCount(evidences.rows.length);
  });

  test("the lead variant link opens the variant page", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    const variantId = evidences.rows[0].leadVariantId;
    expect(variantId, "the first credible set has a lead variant").toBeTruthy();
    await section.leadVariantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${variantId}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("clicking an L2G score opens the locus-to-gene popover of that credible set", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    const score = (evidences.rows[0].score as number).toFixed(3);

    await section.l2gTrigger(0).click();
    await expect(section.l2gPopover).toBeVisible();
    await expect(section.l2gPopover).toContainText("Colocalisation");
    await expect(section.l2gPopover).toContainText("IL6R");
    await expect(section.l2gPopover).toContainText(score);

    await page.keyboard.press("Escape");
    await expect(section.l2gPopover).toBeHidden();

    await section.l2gTrigger(1).click();
    await expect(section.l2gPopover).toBeVisible();
    await expect(section.l2gPopover).toContainText((evidences.rows[1].score as number).toFixed(3));
    await page.keyboard.press("Escape");
    await expect(section.l2gPopover).toBeHidden();
  });

  test("the publication cell opens a drawer with the study's publication", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    const pubmedId = evidences.rows[0].pubmedId as string;
    expect(pubmedId, "the first study has a PubMed id").toBeTruthy();

    await section.publicationTrigger(0).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(1);
    await expect(drawer.entry(pubmedId)).toBeVisible();
    await drawer.close();
  });

  test("the Columns menu hides and shows a column", async ({ page }) => {
    const { section } = await open(page, FEW);
    const list = await section.table.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(EVIDENCE_GWAS_HEADERS.length);

    await list.getByRole("checkbox", { name: "Sample size" }).uncheck();
    await expect(section.table.headers.filter({ hasText: "Sample size" })).toHaveCount(0);
    await expect(section.table.headers).toHaveCount(EVIDENCE_GWAS_HEADERS.length - 1);

    await list.getByRole("checkbox", { name: "Sample size" }).check();
    await expect(section.table.headers).toHaveText([...EVIDENCE_GWAS_HEADERS]);
  });

  test("lists every credible set of a pair with many records, page by page", async ({ page }) => {
    const { section, evidences } = await open(page, MANY);
    const total = evidences.count;
    expect(total, "PCSK9 has many credible sets for LDL cholesterol").toBeGreaterThan(
      3 * EVIDENCE_GWAS_PAGE_SIZE
    );
    const table = section.table;

    await test.step("first page matches the API", async () => {
      await table.expectRowCount(EVIDENCE_GWAS_PAGE_SIZE);
      await table.expectPosition(`1 - ${EVIDENCE_GWAS_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      for (let index = 0; index < EVIDENCE_GWAS_PAGE_SIZE; index++) {
        await expectRow(section, index, evidences.rows[index]);
      }
    });

    const firstPage = await table
      .column(0)
      .evaluateAll((cells) => cells.map((cell) => cell.querySelector("a")?.getAttribute("href")));
    await test.step("the next page shows different credible sets", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(
        `${EVIDENCE_GWAS_PAGE_SIZE + 1} - ${2 * EVIDENCE_GWAS_PAGE_SIZE} of ${total}`,
        { canGoBack: true, canGoForward: true }
      );
      await expect
        .poll(async () =>
          table
            .column(0)
            .evaluateAll((cells) =>
              cells.map((cell) => cell.querySelector("a")?.getAttribute("href"))
            )
        )
        .not.toEqual(firstPage);
      await table.expectRowCount(EVIDENCE_GWAS_PAGE_SIZE);
    });

    await test.step("the last page holds the remainder and cannot go forward", async () => {
      await table.lastPageButton.click();
      const lastStart =
        Math.floor((total - 1) / EVIDENCE_GWAS_PAGE_SIZE) * EVIDENCE_GWAS_PAGE_SIZE + 1;
      await table.expectPosition(`${lastStart} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await table.expectRowCount(total - lastStart + 1);
    });

    await test.step("first page goes back to the first credible sets", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(`1 - ${EVIDENCE_GWAS_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect
        .poll(async () =>
          table
            .column(0)
            .evaluateAll((cells) =>
              cells.map((cell) => cell.querySelector("a")?.getAttribute("href"))
            )
        )
        .toEqual(firstPage);
    });
  });

  test("a larger page size shows more credible sets on one page", async ({ page }) => {
    const { section, evidences } = await open(page, MANY);
    await section.table.pageSizeSelect.selectOption("25");
    await section.table.expectRowCount(25);
    await section.table.expectPosition(`1 - 25 of ${evidences.count}`, {
      canGoBack: false,
      canGoForward: true,
    });
    await section.table.pageSizeSelect.selectOption("100");
    await section.table.expectRowCount(100);
    await section.table.expectPosition(`1 - 100 of ${evidences.count}`, {
      canGoBack: false,
      canGoForward: true,
    });
  });

  test("the export offers JSON and TSV with every credible set, named after the pair", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    const stem = `GWASassociations-${FEW.ensgId}-${FEW.efoId}`;

    const json = await section.controls.downloadJson();
    expect(json.filename).toBe(`${stem}.json`);
    expect(json.rows).toHaveLength(evidences.count);
    const exported = JSON.stringify(json.rows);
    for (const row of evidences.rows) {
      expect(exported).toContain(row.credibleSetId);
      expect(exported).toContain(row.studyId);
    }

    const tsv = await section.controls.downloadTsv();
    expect(tsv.filename).toBe(`${stem}.tsv`);
    expect(tsv.header).toEqual(expect.arrayContaining(["credibleSet", "study", "pValue"]));
    expect(tsv.lines.filter((line) => line.join("").length > 0)).toHaveLength(evidences.count);
    expect(tsv.lines.flat()).toContain(evidences.rows[0].credibleSetId);
  });

  test("the API query drawer is loaded with the section's query and target", async ({ page }) => {
    const { section } = await open(page, FEW);
    // GraphiQL builds its schema from the introspection response; wait for it so that a schema it
    // cannot parse is caught while the test is still running.
    const schema = page.waitForResponse((response) =>
      (response.request().postData() ?? "").includes("IntrospectionQuery")
    );
    await section.controls.openApiQuery(EVIDENCE_GWAS_OPERATION, FEW.ensgId);
    await schema;
    // The documentation explorer is built from that schema: it explains the schema when the
    // schema is valid and reports "Schema is invalid" when it is not.
    await section.controls.apiQueryDrawer
      .getByRole("button", { name: "Open Documentation Explorer" })
      .click();
    await expect(section.controls.apiQueryDrawer).toContainText(
      "A GraphQL schema provides a root type for each kind of operation."
    );
    await section.controls.closeApiQuery();
  });

  test("a pair without GWAS evidence has no GWAS credible sets section", async ({ page }) => {
    await new EvidencePage(page).goto(NONE.ensgId, NONE.efoId);
    await expectSectionLoaded(page, "eva");
    await expect(sectionLocator(page, EvidenceGwasCredibleSetsSection.id)).toHaveCount(0);
  });

  test("the section survives a reload of the evidence page", async ({ page }) => {
    const { evidences } = await open(page, FEW);
    const reloaded = waitForOperation<EvidenceGwasData>(page, EVIDENCE_GWAS_OPERATION);
    await page.reload();
    await reloaded;
    const section = new EvidenceGwasCredibleSetsSection(page);
    await expectSectionLoaded(page, EvidenceGwasCredibleSetsSection.id);
    await section.table.expectRowCount(evidences.count);
  });
});
