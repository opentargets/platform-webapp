import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  EVIDENCE_GENE_BURDEN_HEADERS,
  EVIDENCE_GENE_BURDEN_OPERATION,
  EVIDENCE_GENE_BURDEN_PAGE_SIZE,
  type EvidenceGeneBurdenData,
  type EvidenceGeneBurdenRow,
  EvidenceGeneBurdenSection,
} from "../../../../POM/objects/widgets/Evidence/geneBurden";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { PublicationsDrawer } from "../../../../POM/objects/widgets/Target/publicationsDrawer";
import { EvidencePage } from "../../../../POM/page/evidence/evidence";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

/** PCSK9 in LDL cholesterol measurement: 130 gene burden results over 13 pages. */
const MANY = { ensgId: "ENSG00000169174", efoId: "EFO_0004611" };
/** BRAF in melanoma: no gene burden evidence. */
const NONE = { ensgId: "ENSG00000157764", efoId: "MONDO_0005105" };
/** IL6R in myocardial infarction: no gene burden evidence either. */
const NONE_GENETIC = { ensgId: "ENSG00000160712", efoId: "MONDO_0005068" };

type Pair = { ensgId: string; efoId: string };

/** Open an evidence page and wait for the gene burden section with its first-page response. */
async function open(page: Page, pair: Pair = MANY) {
  const response = waitForOperation<EvidenceGeneBurdenData>(page, EVIDENCE_GENE_BURDEN_OPERATION);
  await new EvidencePage(page).goto(pair.ensgId, pair.efoId);
  const { data } = await response;
  const section = new EvidenceGeneBurdenSection(page);
  await expectSectionLoaded(page, EvidenceGeneBurdenSection.id);
  return { section, data, evidences: data.disease.evidenceViews.geneBurden };
}

type GeneBurdenPage = {
  rows: EvidenceGeneBurdenRow[];
  count: number;
  variables: Record<string, any>;
};

/** Resolve with the next GeneBurdenQuery response whose variables satisfy `match`. */
function waitForQuery(page: Page, match: (variables: Record<string, any>) => boolean) {
  return page
    .waitForResponse((response) => {
      const post = response.request().postData() ?? "";
      if (!post.includes(EVIDENCE_GENE_BURDEN_OPERATION)) return false;
      return match(JSON.parse(post).variables ?? {});
    })
    .then(async (response): Promise<GeneBurdenPage> => {
      const body = (await response.json()) as { data: EvidenceGeneBurdenData };
      const view = body.data.disease.evidenceViews.geneBurden;
      return {
        ...view,
        variables: JSON.parse(response.request().postData() ?? "{}").variables,
      };
    });
}

const waitForSearch = (page: Page, text: string | undefined) =>
  waitForQuery(page, (variables) =>
    text === undefined ? !variables.search?.text : variables.search?.text === text
  );

const waitForSort = (page: Page, key: string, direction: string) =>
  waitForQuery(page, (variables) =>
    variables.sort?.some((sort: any) => sort.key === key && sort.direction === direction)
  );

/** Type a term in the search box and wait for the first page of its results. */
async function searchFor(page: Page, section: EvidenceGeneBurdenSection, term: string) {
  const response = waitForSearch(page, term);
  await section.table.search(term);
  const result = await response;
  await section.table.expectRowCount(Math.min(result.count, EVIDENCE_GENE_BURDEN_PAGE_SIZE));
  return result;
}

const NA = "N/A";
const number = (value: number | null) => (value ? value.toLocaleString("en-US") : NA);
const rounded = (value: number) => String(parseFloat(value.toFixed(3)));
const withInterval = (value: number | null, lower: number | null, upper: number | null) => {
  if (!value) return NA;
  const interval = lower && upper ? ` (${rounded(lower)}, ${rounded(upper)})` : "";
  return `${rounded(value)}${interval}`;
};
const EFFECTS: Record<string, string> = {
  lof: "Loss of Function",
  gof: "Gain of Function",
  risk: "Risk",
  protect: "Protective",
};
const effectLabel = (value: string | null) =>
  value ? EFFECTS[value.toLowerCase()] : "Inconclusive Assessment";

/**
 * Link-outs the app falls back on when a row carries no `urls`; the cohort links to the first
 * of the row's `urls` when there is one.
 */
const PROJECT_LINKS: Record<string, (targetId: string) => string> = {
  "Epi25 collaborative": (targetId) => `https://epi25.broadinstitute.org/gene/${targetId}`,
  "Autism Sequencing Consortium": (targetId) => `https://asc.broadinstitute.org/gene/${targetId}`,
  Genebass: (targetId) =>
    `https://app.genebass.org/gene/${targetId}?burdenSet=pLoF&phewasOpts=1&resultLayout=full`,
  "AMP-PD": () => "https://amp-pd.org/",
  FinnGen: (targetId) => `https://r12.finngen.fi/gene/${targetId}`,
};
const sourceLink = (row: EvidenceGeneBurdenRow): string | null =>
  row.urls?.[0] ?? (row.projectId ? PROJECT_LINKS[row.projectId]?.(row.targetId) : null) ?? null;
const sourceLabel = (row: EvidenceGeneBurdenRow) => {
  if (!row.cohortId) return row.projectId;
  if (!row.projectId) return row.cohortId;
  return `${row.cohortId} (${row.projectId})`;
};

/** Assert the cells of one rendered row against the API record it was built from. */
async function expectRow(
  section: EvidenceGeneBurdenSection,
  index: number,
  row: EvidenceGeneBurdenRow
) {
  await expect(section.diseaseLink(index)).toHaveText(row.diseaseName);
  await expect(section.diseaseLink(index)).toHaveAttribute("href", `/disease/${row.diseaseId}`);

  const cohort = section.cell(index, "cohort");
  if (!row.cohortId && !row.projectId) {
    await expect(cohort).toHaveText(NA);
  } else {
    await expect(cohort).toHaveText(sourceLabel(row) as string);
    const href = sourceLink(row);
    if (href) await expect(section.cohortLink(index)).toHaveAttribute("href", href);
    else await expect(section.cohortLink(index)).toHaveCount(0);
  }

  if (!row.ancestry) {
    await expect(section.cell(index, "ancestry")).toHaveText(NA);
  } else {
    await expect(section.cell(index, "ancestry")).toHaveText(row.ancestry);
    if (row.ancestryId) {
      await expect(section.ancestryLink(index)).toHaveAttribute(
        "href",
        `http://purl.obolibrary.org/obo/${row.ancestryId}`
      );
    } else {
      await expect(section.ancestryLink(index)).toHaveCount(0);
    }
  }

  await expect(section.cell(index, "model")).toContainText(row.statisticalMethod ?? "");
  // The app shows N/A for a missing or an empty list.
  await expect(section.cell(index, "allelicRequirement")).toHaveText(
    row.allelicRequirements?.[0] ?? NA
  );
  await expect(section.cell(index, "casesWithQv")).toHaveText(
    number(row.studyCasesWithQualifyingVariants)
  );
  await expect(section.cell(index, "cases")).toHaveText(number(row.studyCases));
  await expect(section.cell(index, "sampleSize")).toHaveText(number(row.studySampleSize));
  await expect(section.cell(index, "oddsRatio")).toHaveText(
    withInterval(
      row.oddsRatio,
      row.oddsRatioConfidenceIntervalLower,
      row.oddsRatioConfidenceIntervalUpper
    )
  );
  await expect(section.cell(index, "beta")).toHaveText(
    withInterval(row.beta, row.betaConfidenceIntervalLower, row.betaConfidenceIntervalUpper)
  );
  await expect(section.directionIcons(index)).toHaveCount(2);
  await expect(section.cell(index, "pValue")).toHaveText(
    `${row.pValueMantissa.toFixed(3)}×10${row.pValueExponent}`
  );

  const literature = row.literature ?? [];
  if (literature.length === 0) {
    await expect(section.cell(index, "literature")).toHaveText(NA);
  } else if (literature.length > 1) {
    await expect(section.literatureTrigger(index)).toHaveText(`${literature.length} publications`);
  } else {
    await expect(section.literatureTrigger(index)).toHaveCount(1);
  }
}

test.describe("Evidence page: Gene Burden", () => {
  // The evidence page mounts a Europe PMC section and the literature drawers query it. It is
  // a throttled third-party service, so it is stubbed: the tests depend only on the app and API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description, headers and the first page of results @smoke", async ({
    page,
  }) => {
    const { section, evidences } = await open(page);
    const total = evidences.count;
    expect(total, "PCSK9 has many gene burden results for LDL cholesterol").toBeGreaterThan(
      3 * EVIDENCE_GENE_BURDEN_PAGE_SIZE
    );

    await test.step("title and description name the target and the disease", async () => {
      await expect(section.title).toContainText("Gene Burden");
      await expect(section.title).toContainText("Genetic association");
      await expect(section.description).toHaveText(
        "Gene burden analysis prioritising PCSK9 as likely causal gene for low density lipoprotein cholesterol measurement. Source: Open Targets"
      );
      await expect(section.description.getByRole("link", { name: "Open Targets" })).toHaveAttribute(
        "href",
        "https://platform-docs.opentargets.org/evidence#gene-burden"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(section.table.headers).toHaveText([...EVIDENCE_GENE_BURDEN_HEADERS]);
    });

    await test.step("the first page holds the first results, each with the record's values", async () => {
      await section.table.expectRowCount(EVIDENCE_GENE_BURDEN_PAGE_SIZE);
      for (let index = 0; index < EVIDENCE_GENE_BURDEN_PAGE_SIZE; index++) {
        await expectRow(section, index, evidences.rows[index]);
      }
    });

    await test.step("the footer reports the total, starts on the first page and has a search box", async () => {
      await section.table.expectPosition(`1 - ${EVIDENCE_GENE_BURDEN_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect(section.table.searchInput).toBeVisible();
      await expect(section.table.pageSizeSelect).toHaveValue("10");
      await expect(section.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
    });
  });

  test("results without odds ratio, cases or a cohort show N/A rather than empty cells", async ({
    page,
  }) => {
    const { section, evidences } = await open(page);
    // Gene burden rows are heterogeneous: odds ratios exist only for binary traits and many
    // cohorts report no case counts. Check the rows of the first page that lack them.
    const missing = evidences.rows.findIndex(
      (row) => !row.oddsRatio && !row.studyCases && !row.studyCasesWithQualifyingVariants
    );
    expect(
      missing,
      "the first page holds a quantitative-trait result without case counts"
    ).toBeGreaterThanOrEqual(0);
    await expect(section.cell(missing, "oddsRatio")).toHaveText(NA);
    await expect(section.cell(missing, "cases")).toHaveText(NA);
    await expect(section.cell(missing, "casesWithQv")).toHaveText(NA);
  });

  test("a result with a beta shows it rounded to three decimals with its interval", async ({
    page,
  }) => {
    const { section, evidences } = await open(page);
    const index = evidences.rows.findIndex((row) => row.beta !== null && row.beta !== 0);
    expect(index, "the first page holds a result with a beta").toBeGreaterThanOrEqual(0);
    const { beta } = evidences.rows[index];
    await expect(section.cell(index, "beta")).toContainText(rounded(beta as number));
    await expect(section.cell(index, "beta")).not.toHaveText(NA);
  });

  test("the model tooltip describes the statistical method", async ({ page }) => {
    const { section, evidences } = await open(page);
    const index = evidences.rows.findIndex((row) => row.statisticalMethodOverview);
    expect(index, "the first page holds a model with an overview").toBeGreaterThanOrEqual(0);

    await section.helpIcon(index, "model").hover();
    await expect(page.getByRole("tooltip")).toContainText(
      evidences.rows[index].statisticalMethodOverview as string
    );
    await page.mouse.move(0, 0);
    await expect(page.getByRole("tooltip")).toBeHidden();
  });

  test("the disease tooltip shows the disease as reported by the source", async ({ page }) => {
    const { section, evidences } = await open(page);
    const index = evidences.rows.findIndex((row) => row.diseaseFromSource);
    expect(index, "the first page holds a result with a reported disease").toBeGreaterThanOrEqual(
      0
    );

    await section.helpIcon(index, "disease").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(evidences.rows[index].diseaseFromSource as string);
  });

  test("the cohort links to the row's own url, or to the project's page for the gene", async ({
    page,
  }) => {
    const { section } = await open(page);
    // The first page of this pair holds no linked project: search for one with urls and one without.
    for (const term of ["AstraZeneca", "Genebass"]) {
      const { rows } = await searchFor(page, section, term);
      const index = rows.findIndex((row) => row.projectId && sourceLink(row));
      expect(index, `a ${term} result links its cohort`).toBeGreaterThanOrEqual(0);
      const row = rows[index];
      await expect(section.cohortLink(index)).toHaveAttribute("href", sourceLink(row) as string);
      await expect(section.cohortLink(index)).toHaveText(sourceLabel(row) as string);
    }
  });

  test("a project without a link shows its cohort as plain text", async ({ page }) => {
    const { section, evidences } = await open(page);
    const index = evidences.rows.findIndex((row) => row.projectId && !sourceLink(row));
    expect(index, "the first page holds a result whose project has no link").toBeGreaterThanOrEqual(
      0
    );
    await expect(section.cohortLink(index)).toHaveCount(0);
    await expect(section.cell(index, "cohort")).toHaveText(
      sourceLabel(evidences.rows[index]) as string
    );
  });

  test("the search box filters the results on the server and shows the matches", async ({
    page,
  }) => {
    const { section, evidences } = await open(page);
    await expect(section.table.searchInput).toBeVisible();

    const { rows, count, variables } = await searchFor(page, section, "AstraZeneca");
    expect(variables.search, "the search is sent to the API").toMatchObject({
      text: "AstraZeneca",
    });
    expect(count, "the search narrows the results").toBeLessThan(evidences.count);
    expect(count).toBeGreaterThan(0);
    await section.table.expectRowCount(Math.min(count, EVIDENCE_GENE_BURDEN_PAGE_SIZE));
    await section.table.expectPosition(
      `1 - ${Math.min(count, EVIDENCE_GENE_BURDEN_PAGE_SIZE)} of ${count}`,
      {
        canGoBack: false,
        canGoForward: count > EVIDENCE_GENE_BURDEN_PAGE_SIZE,
      }
    );
    for (const [index, row] of rows.entries()) await expectRow(section, index, row);

    await test.step("a search without matches shows no rows", async () => {
      const none = await searchFor(page, section, "no such cohort anywhere");
      expect(none.count).toBe(0);
      await expect(section.table.rows).toHaveCount(0);
    });

    await test.step("clearing the search brings every result back", async () => {
      await section.table.searchInput.fill("");
      const total = evidences.count;
      await section.table.expectPosition(`1 - ${EVIDENCE_GENE_BURDEN_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
    });
  });

  test("the numeric headers sort the results on the server, in both directions", async ({
    page,
  }) => {
    const { section } = await open(page);
    const header = section.table.headers.filter({ hasText: "Cases with QV" });

    const descending = waitForSort(page, "CASES_WITH_QUALIFYING_VARIANTS", "DESCENDING");
    await header.click();
    const first = await descending;
    const values = first.rows.map((row) => row.studyCasesWithQualifyingVariants ?? 0);
    expect(values, "the API returns the largest counts first").toEqual(
      [...values].sort((a, b) => b - a)
    );
    for (const [index, row] of first.rows.entries()) await expectRow(section, index, row);

    const ascending = waitForSort(page, "CASES_WITH_QUALIFYING_VARIANTS", "ASCENDING");
    await header.click();
    const second = await ascending;
    const smallest = second.rows.map((row) => row.studyCasesWithQualifyingVariants ?? 0);
    expect(smallest).toEqual([...smallest].sort((a, b) => a - b));
    for (const [index, row] of second.rows.entries()) await expectRow(section, index, row);
  });

  test("the ancestry links to its ontology term", async ({ page }) => {
    const { section, evidences } = await open(page);
    const index = evidences.rows.findIndex((row) => row.ancestry && row.ancestryId);
    expect(index, "the first page holds a result with a known ancestry").toBeGreaterThanOrEqual(0);
    await expect(section.ancestryLink(index)).toHaveAttribute(
      "href",
      `http://purl.obolibrary.org/obo/${evidences.rows[index].ancestryId}`
    );
  });

  test("the header tooltip of Direction of Effect links to the documentation", async ({ page }) => {
    const { section } = await open(page);
    await section.table.headers.filter({ hasText: "Direction of Effect" }).locator("sup").hover();
    await expect(
      page.getByRole("tooltip").getByRole("link", { name: "More info on our assessment method" })
    ).toHaveAttribute("href", "https://platform-docs.opentargets.org/evidence#gene-burden");
  });

  test("the direction of effect icons name the variant effect and the effect on the trait", async ({
    page,
  }) => {
    const { section, evidences } = await open(page);
    for (const index of [0, 1, 2]) {
      const { directionOnTarget, directionOnTrait } = evidences.rows[index];
      await section.directionIcons(index).first().hover();
      await expect(page.getByRole("tooltip")).toHaveText(
        `${effectLabel(directionOnTarget)} │ ${effectLabel(directionOnTrait)}`
      );
      await page.mouse.move(0, 0);
      await expect(page.getByRole("tooltip")).toBeHidden();
    }
  });

  test("the disease link opens the disease page", async ({ page }) => {
    const { section, evidences } = await open(page);
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${evidences.rows[0].diseaseId}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("the literature cell opens a drawer with the publications of that result", async ({
    page,
  }) => {
    const { section, evidences } = await open(page);
    const index = evidences.rows.findIndex((row) => (row.literature ?? []).length >= 1);
    expect(index, "the first page holds a result with literature").toBeGreaterThanOrEqual(0);
    const literature = evidences.rows[index].literature!;

    await section.literatureTrigger(index).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(literature.length);
    for (const id of literature) await expect(drawer.entry(id)).toBeVisible();
    await drawer.close();
  });

  test("the Columns menu hides and shows a column", async ({ page }) => {
    const { section } = await open(page);
    const list = await section.table.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(EVIDENCE_GENE_BURDEN_HEADERS.length);

    await list.getByRole("checkbox", { name: "Ancestry" }).uncheck();
    await expect(section.table.headers.filter({ hasText: "Ancestry" })).toHaveCount(0);
    await expect(section.table.headers).toHaveCount(EVIDENCE_GENE_BURDEN_HEADERS.length - 1);

    await list.getByRole("checkbox", { name: "Ancestry" }).check();
    await expect(section.table.headers).toHaveText([...EVIDENCE_GENE_BURDEN_HEADERS]);
  });

  test("pages through every result: next, last, first", async ({ page }) => {
    const { section, evidences } = await open(page);
    const total = evidences.count;
    const table = section.table;
    // Every row of this pair names the same disease: tell pages apart by the whole row.
    const diseases = async () => (await table.rows.allInnerTexts()).map((text) => text.trim());
    const size = EVIDENCE_GENE_BURDEN_PAGE_SIZE;

    const firstPage = await diseases();
    await test.step("the next page shows different results", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(`${size + 1} - ${2 * size} of ${total}`, {
        canGoBack: true,
        canGoForward: true,
      });
      await expect.poll(diseases).not.toEqual(firstPage);
      await table.expectRowCount(size);
    });

    await test.step("the last page holds the remainder and cannot go forward", async () => {
      await table.lastPageButton.click();
      const lastStart = Math.floor((total - 1) / size) * size + 1;
      await table.expectPosition(`${lastStart} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await table.expectRowCount(total - lastStart + 1);
    });

    await test.step("previous steps back one page", async () => {
      await table.previousPageButton.click();
      const previousStart = (Math.floor((total - 1) / size) - 1) * size + 1;
      await table.expectPosition(`${previousStart} - ${previousStart + size - 1} of ${total}`, {
        canGoBack: true,
        canGoForward: true,
      });
    });

    await test.step("first page goes back to the first results", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(`1 - ${size} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect.poll(diseases).toEqual(firstPage);
    });
  });

  test("a larger page size shows more results on one page", async ({ page }) => {
    const { section, evidences } = await open(page);
    await section.table.pageSizeSelect.selectOption("25");
    await section.table.expectRowCount(25);
    await section.table.expectPosition(`1 - 25 of ${evidences.count}`, {
      canGoBack: false,
      canGoForward: true,
    });
  });

  test("the largest page size shows 100 results, every one of them rendered", async ({ page }) => {
    const { section, evidences } = await open(page);
    await section.table.pageSizeSelect.selectOption("100");
    await section.table.expectRowCount(100);
    await section.table.expectPosition(`1 - 100 of ${evidences.count}`, {
      canGoBack: false,
      canGoForward: true,
    });
  });

  test("the export offers JSON and TSV with every result, named after the pair", async ({
    page,
  }) => {
    const { section, evidences } = await open(page);
    const stem = `geneburden-${MANY.ensgId}-${MANY.efoId}`;

    const json = await section.controls.downloadJson();
    expect(json.filename).toBe(`${stem}.json`);
    expect(json.rows).toHaveLength(evidences.count);
    const exported = JSON.stringify(json.rows);
    expect(exported).toContain(evidences.rows[0].diseaseName);

    const tsv = await section.controls.downloadTsv();
    expect(tsv.filename).toBe(`${stem}.tsv`);
    expect(tsv.header).toHaveLength(13);
    expect(tsv.header.slice(0, 9)).toEqual([
      "diseasePhenotype",
      "cohortProject",
      "ancestry",
      "model",
      "allelicRequirement",
      "casesWithQv",
      "cases",
      "sampleSize",
      "oddsRatioCi95",
    ]);
    expect(tsv.header.at(-1)).toBe("literature");
    expect(tsv.lines.filter((line) => line.join("").length > 0)).toHaveLength(evidences.count);
  });

  test("every exported column has a readable name", async ({ page }) => {
    const { section } = await open(page);
    const tsv = await section.controls.downloadTsv();
    // The direction of effect and p-value columns are labelled with React elements.
    expect(tsv.header.filter((name) => /object/i.test(name))).toEqual([]);
  });

  test("the API query drawer is loaded with the section's query and target", async ({ page }) => {
    const { section } = await open(page);
    // GraphiQL builds its schema from the introspection response; wait for it so that a schema it
    // cannot parse is caught while the test is still running.
    const schema = page.waitForResponse((response) =>
      (response.request().postData() ?? "").includes("IntrospectionQuery")
    );
    await section.controls.openApiQuery(EVIDENCE_GENE_BURDEN_OPERATION, MANY.ensgId);
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

  test("pairs without gene burden evidence have no Gene Burden section", async ({ page }) => {
    await new EvidencePage(page).goto(NONE.ensgId, NONE.efoId);
    await expectSectionLoaded(page, "eva");
    await expect(sectionLocator(page, EvidenceGeneBurdenSection.id)).toHaveCount(0);

    await new EvidencePage(page).goto(NONE_GENETIC.ensgId, NONE_GENETIC.efoId);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(sectionLocator(page, EvidenceGeneBurdenSection.id)).toHaveCount(0);
  });
});
