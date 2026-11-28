import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import {
  EVIDENCE_EVA_HEADERS,
  EVIDENCE_EVA_OPERATION,
  EVIDENCE_EVA_PAGE_SIZE,
  type EvidenceEvaData,
  type EvidenceEvaRow,
  EvidenceEvaSection,
} from "../../../../POM/objects/widgets/Evidence/eva";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { PublicationsDrawer } from "../../../../POM/objects/widgets/Target/publicationsDrawer";
import { EvidencePage } from "../../../../POM/page/evidence/evidence";
import { expectSectionLoaded, sectionLocator } from "../../../../utils/sections";

/** BRAF in melanoma: three ClinVar submissions, one page. */
const FEW = { ensgId: "ENSG00000157764", efoId: "MONDO_0005105" };
/** LDLR in familial hypercholesterolemia 1: thousands of ClinVar submissions. */
const MANY = { ensgId: "ENSG00000130164", efoId: "MONDO_0007750" };
/** IL6R in myocardial infarction: no ClinVar submissions. */
const NONE = { ensgId: "ENSG00000160712", efoId: "MONDO_0005068" };

type Pair = { ensgId: string; efoId: string };

/** Open an evidence page and wait for the ClinVar section with its first-page response. */
async function open(page: Page, pair: Pair) {
  const response = waitForOperation<EvidenceEvaData>(page, EVIDENCE_EVA_OPERATION);
  await new EvidencePage(page).goto(pair.ensgId, pair.efoId);
  const { data } = await response;
  const section = new EvidenceEvaSection(page);
  await expectSectionLoaded(page, EvidenceEvaSection.id);
  return { section, data, evidences: data.disease.evidenceViews.eva };
}

const NA = "N/A";
const sentence = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ").toLowerCase();
const STARS: Record<string, number> = {
  "practice guideline": 4,
  "reviewed by expert panel": 3,
  "criteria provided, multiple submitters, no conflicts": 2,
  "criteria provided, conflicting interpretations": 1,
  "criteria provided, single submitter": 1,
  "no assertion for the individual variant": 0,
  "no assertion criteria provided": 0,
  "no assertion provided": 0,
};
const EFFECTS: Record<string, string> = {
  lof: "Loss of Function",
  gof: "Gain of Function",
  risk: "Risk",
  protect: "Protective",
};
const effectLabel = (value: string | null) =>
  value ? EFFECTS[value.toLowerCase()] : "Inconclusive Assessment";

/** Assert the cells of one rendered row against the API record it was built from. */
async function expectRow(section: EvidenceEvaSection, index: number, row: EvidenceEvaRow) {
  await expect(section.diseaseLink(index)).toHaveText(row.diseaseName);
  await expect(section.diseaseLink(index)).toHaveAttribute("href", `/disease/${row.diseaseId}`);

  if (row.variantId) {
    await expect(section.variantLink(index)).toHaveAttribute("href", `/variant/${row.variantId}`);
    await expect(section.variantLink(index)).toContainText(String(row.variantPosition));
  } else {
    await expect(section.cell(index, "variant")).toHaveText(NA);
  }

  if (row.variantRsId) {
    await expect(section.rsIdLink(index)).toHaveText(row.variantRsId);
    await expect(section.rsIdLink(index)).toHaveAttribute(
      "href",
      `https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${row.variantRsId}`
    );
  } else {
    await expect(section.cell(index, "rsId")).toHaveText(NA);
  }

  await expect(section.cell(index, "hgvs")).toHaveText(row.variantHgvsId ?? NA);

  if (row.studyId) {
    await expect(section.clinvarLink(index)).toHaveText(row.studyId);
    await expect(section.clinvarLink(index)).toHaveAttribute(
      "href",
      `https://www.ncbi.nlm.nih.gov/clinvar/${row.studyId}`
    );
  } else {
    await expect(section.cell(index, "clinvarId")).toHaveText(NA);
  }

  if (row.variantFunctionalConsequenceId) {
    await expect(
      section.cell(index, "consequence").getByTestId("label-chip-value").first()
    ).toHaveText(sentence(row.variantFunctionalConsequenceLabel as string));
  } else {
    await expect(section.cell(index, "consequence")).toHaveText(NA);
  }

  await expect(section.directionIcons(index)).toHaveCount(2);

  const significances = row.clinicalSignificances ?? [];
  await expect(section.cell(index, "significance")).toHaveText(
    significances.length === 1 ? sentence(significances[0]) : significances.map(sentence).join("")
  );

  const origins = row.alleleOrigins ?? [];
  await expect(section.cell(index, "alleleOrigin")).toContainText(
    origins.length === 0 ? NA : origins.map(sentence).join("; ")
  );

  await expect(section.stars(index)).toHaveCount(4);
  await expect(section.filledStars(index)).toHaveCount(STARS[row.confidence ?? ""] ?? 0);

  await expect(section.cell(index, "score")).toHaveText(row.score.toFixed(2));

  const literature = (row.literature ?? []).filter((id) => id !== "NA");
  if (literature.length === 0) {
    await expect(section.cell(index, "literature")).toHaveText(NA);
  } else if (literature.length > 1) {
    await expect(section.literatureTrigger(index)).toHaveText(`${literature.length} publications`);
  } else {
    await expect(section.literatureTrigger(index)).toHaveCount(1);
  }
}

test.describe("Evidence page: ClinVar (EVA)", () => {
  // The evidence page mounts a Europe PMC section and the literature drawers query it. It is
  // a throttled third-party service, so it is stubbed: the tests depend only on the app and API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description and every submission of a pair with few records @smoke", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    expect(evidences.count, "BRAF has a handful of ClinVar records for melanoma").toBe(
      evidences.rows.length
    );
    expect(evidences.count).toBeGreaterThan(1);
    expect(evidences.count).toBeLessThan(EVIDENCE_EVA_PAGE_SIZE);

    await test.step("title and description name the target and the disease", async () => {
      await expect(section.title).toContainText("ClinVar");
      await expect(section.title).toContainText("Genetic association");
      await expect(section.description).toHaveText(
        "Germline variation associated with BRAF on patients affected by melanoma. Source: EVA"
      );
      await expect(section.description.getByRole("link", { name: "EVA" })).toHaveAttribute(
        "href",
        "https://www.ebi.ac.uk/eva/"
      );
    });

    await test.step("exact column headers", async () => {
      await expect(section.table.headers).toHaveText([...EVIDENCE_EVA_HEADERS]);
    });

    await test.step("one row per submission, with the record's values", async () => {
      await section.table.expectRowCount(evidences.count);
      for (const [index, row] of evidences.rows.entries()) await expectRow(section, index, row);
    });

    await test.step("one page: the footer reports the total and nothing can be paged", async () => {
      await section.table.expectPosition(`1 - ${evidences.count} of ${evidences.count}`, {
        canGoBack: false,
        canGoForward: false,
      });
      await expect(section.table.searchInput).toHaveCount(0);
      await expect(section.table.pageSizeSelect).toHaveValue("10");
      await expect(section.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);
    });
  });

  test("records with no allele origin, no literature or no consequence effect show N/A", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    const bare = evidences.rows.findIndex((row) => (row.alleleOrigins ?? []).length === 0);
    expect(bare, "BRAF/melanoma has a record without allele origin").toBeGreaterThanOrEqual(0);
    await expect(section.cell(bare, "alleleOrigin")).toHaveText(NA);
    await expect(section.cell(bare, "literature")).toHaveText(NA);
    await expect(section.literatureTrigger(bare)).toHaveCount(0);
  });

  test("the header tooltip of Direction of Effect links to the documentation", async ({ page }) => {
    const { section } = await open(page, FEW);
    await section.table.headers.filter({ hasText: "Direction of Effect" }).locator("sup").hover();
    const link = page.getByRole("tooltip").getByRole("link", {
      name: "More info on our assessment method",
    });
    await expect(link).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/evidence#clinvar"
    );
  });

  test("the direction of effect icons name the variant effect and the effect on the trait", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, MANY);
    const lof = evidences.rows.findIndex((row) => row.directionOnTarget === "LoF");
    expect(lof, "the first page of LDLR holds a loss-of-function record").toBeGreaterThanOrEqual(0);
    const plain = evidences.rows.findIndex((row) => !row.directionOnTarget);
    expect(
      plain,
      "the first page of LDLR holds a record without a variant effect"
    ).toBeGreaterThanOrEqual(0);

    await section.directionIcons(lof).first().hover();
    await expect(page.getByRole("tooltip")).toHaveText("Loss of Function │ Risk");
    await page.mouse.move(0, 0);
    await expect(page.getByRole("tooltip")).toBeHidden();

    await section.directionIcons(plain).first().hover();
    await expect(page.getByRole("tooltip")).toHaveText(
      `${effectLabel(evidences.rows[plain].directionOnTarget)} │ ${effectLabel(evidences.rows[plain].directionOnTrait)}`
    );
  });

  test("the variant consequence links to its Sequence Ontology term, missense and stop-gained add ProtVar", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, MANY);
    const missense = evidences.rows.findIndex(
      (row) => row.variantFunctionalConsequenceId === "SO_0001583"
    );
    expect(missense, "the first page holds a missense record").toBeGreaterThanOrEqual(0);
    const row = evidences.rows[missense];
    const chromosome = row.variantChromosome;
    const position = row.variantPosition;
    const referenceAllele = row.variantReferenceAllele;
    const alternateAllele = row.variantAlternateAllele;
    const cell = section.cell(missense, "consequence");

    const vep = cell.locator("a").filter({ hasText: "VEP" });
    await expect(vep).toHaveAttribute("href", "https://identifiers.org/SO:0001583");
    await expect(vep.getByTestId("label-chip-value")).toHaveText("Missense variant");

    const protVar = cell.locator("a").filter({ hasText: "ProtVar" });
    await expect(protVar).toHaveAttribute(
      "href",
      `https://www.ebi.ac.uk/ProtVar/query?chromosome=${chromosome}&genomic_position=${position}&reference_allele=${referenceAllele}&alternative_allele=${alternateAllele}`
    );

    await vep.hover();
    await expect(page.getByRole("tooltip")).toHaveText("Ensembl variant effect predictor");
  });

  test("the disease tooltip lists the reported disease and all reported phenotypes", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, MANY);
    const [row] = evidences.rows;
    expect(
      row.cohortPhenotypes!.length,
      "the record has several cohort phenotypes"
    ).toBeGreaterThan(1);

    await section.helpIcon(0, "disease").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Reported disease or phenotype:");
    await expect(tooltip).toContainText(row.diseaseFromSource as string);
    await expect(tooltip).toContainText("All reported phenotypes:");
    for (const phenotype of row.cohortPhenotypes!) await expect(tooltip).toContainText(phenotype);
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden();
  });

  test("the allele origin tooltip lists the allelic requirements", async ({ page }) => {
    const { section, evidences } = await open(page, MANY);
    const index = evidences.rows.findIndex((row) => (row.allelicRequirements ?? []).length > 0);
    expect(index, "the first page holds a record with allelic requirements").toBeGreaterThanOrEqual(
      0
    );

    await section.helpIcon(index, "alleleOrigin").hover();
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toContainText("Allelic requirements:");
    for (const requirement of evidences.rows[index].allelicRequirements!) {
      await expect(tooltip).toContainText(requirement);
    }
  });

  test("the review status shows filled stars out of four and the status in a tooltip", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, FEW);
    const statuses = new Set(evidences.rows.map((row) => row.confidence));
    expect(statuses.size, "the records have different review statuses").toBeGreaterThan(1);

    for (const [index, row] of evidences.rows.entries()) {
      await expect(section.stars(index)).toHaveCount(4);
      await expect(section.filledStars(index)).toHaveCount(STARS[row.confidence ?? ""] ?? 0);
      await section.stars(index).first().hover();
      await expect(page.getByRole("tooltip")).toHaveText(row.confidence ?? "");
      await page.mouse.move(0, 0);
      await expect(page.getByRole("tooltip")).toBeHidden();
    }
  });

  test("the variant link opens the variant page", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    const variantId = evidences.rows[0].variantId;
    await section.variantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${variantId}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("the disease link opens the disease page", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    await section.diseaseLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${evidences.rows[0].diseaseId}$`));
    await expect(page.getByTestId("profile-page-header-text")).not.toBeEmpty();
  });

  test("the literature cell opens a drawer with the publications of that record", async ({
    page,
  }) => {
    const { section, evidences } = await open(page, MANY);
    const index = evidences.rows.findIndex((row) => (row.literature ?? []).length > 1);
    expect(index, "the first page holds a record with several publications").toBeGreaterThanOrEqual(
      0
    );
    const literature = evidences.rows[index].literature!;

    await section.literatureTrigger(index).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(literature.length);
    for (const id of literature) await expect(drawer.entry(id)).toBeVisible();
    await drawer.close();
  });

  test("a single publication opens a drawer with that publication", async ({ page }) => {
    const { section, evidences } = await open(page, MANY);
    const index = evidences.rows.findIndex((row) => row.literature?.length === 1);
    expect(index, "the first page holds a record with one publication").toBeGreaterThanOrEqual(0);
    const [id] = evidences.rows[index].literature!;

    await section.literatureTrigger(index).click();
    const drawer = new PublicationsDrawer(page);
    await drawer.expectOpen();
    await expect(drawer.entries).toHaveCount(1);
    await expect(drawer.entry(id)).toBeVisible();
    await drawer.close();
  });

  test("the Columns menu hides and shows a column", async ({ page }) => {
    const { section } = await open(page, FEW);
    const list = await section.table.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(EVIDENCE_EVA_HEADERS.length);
    // The Variant column cannot be hidden.
    await expect(list.getByRole("checkbox", { name: "Variant", exact: true })).toBeDisabled();

    await list.getByRole("checkbox", { name: "rsID" }).uncheck();
    await expect(section.table.headers.filter({ hasText: "rsID" })).toHaveCount(0);
    await expect(section.table.headers).toHaveCount(EVIDENCE_EVA_HEADERS.length - 1);

    await list.getByRole("checkbox", { name: "rsID" }).check();
    await expect(section.table.headers).toHaveText([...EVIDENCE_EVA_HEADERS]);
  });

  test("lists every submission of a pair with many records, page by page", async ({ page }) => {
    const { section, evidences } = await open(page, MANY);
    const total = evidences.count;
    expect(total, "LDLR has more than three pages of ClinVar records").toBeGreaterThan(
      3 * EVIDENCE_EVA_PAGE_SIZE
    );
    const table = section.table;
    const links = () =>
      table.column(4).evaluateAll((cells) => cells.map((cell) => cell.textContent?.trim()));

    await test.step("first page matches the API", async () => {
      await table.expectRowCount(EVIDENCE_EVA_PAGE_SIZE);
      await table.expectPosition(`1 - ${EVIDENCE_EVA_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      for (let index = 0; index < EVIDENCE_EVA_PAGE_SIZE; index++) {
        await expectRow(section, index, evidences.rows[index]);
      }
    });

    const firstPage = await links();
    await test.step("the next page shows different records", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(
        `${EVIDENCE_EVA_PAGE_SIZE + 1} - ${2 * EVIDENCE_EVA_PAGE_SIZE} of ${total}`,
        { canGoBack: true, canGoForward: true }
      );
      await expect.poll(links).not.toEqual(firstPage);
      await table.expectRowCount(EVIDENCE_EVA_PAGE_SIZE);
    });

    await test.step("the last page holds the remainder and cannot go forward", async () => {
      await table.lastPageButton.click();
      const lastStart =
        Math.floor((total - 1) / EVIDENCE_EVA_PAGE_SIZE) * EVIDENCE_EVA_PAGE_SIZE + 1;
      await table.expectPosition(`${lastStart} - ${total} of ${total}`, {
        canGoBack: true,
        canGoForward: false,
      });
      await table.expectRowCount(total - lastStart + 1);
    });

    await test.step("first page goes back to the first records", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(`1 - ${EVIDENCE_EVA_PAGE_SIZE} of ${total}`, {
        canGoBack: false,
        canGoForward: true,
      });
      await expect.poll(links).toEqual(firstPage);
    });
  });

  test("a larger page size shows more records on one page", async ({ page }) => {
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

  test("the export offers JSON and TSV with every submission", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    const columns = [
      "diseaseId",
      "diseaseName",
      "variantId",
      "variantRsId",
      "variantHgvsId",
      "clinvarId",
      "variantConsequence",
      "directionOnTarget",
      "directionOnTrait",
      "clinicalSignificances",
      "allelicRequirements",
      "reviewStatus",
      "score",
      "literature",
    ];

    const json = await section.controls.downloadJson();
    expect(json.filename).toBe("eva-evidence.json");
    expect(json.rows).toHaveLength(evidences.count);
    expect(json.rows.map((row) => row.variantId)).toEqual(
      evidences.rows.map((row) => row.variantId)
    );
    expect(json.rows.map((row) => row.variantRsId)).toEqual(
      evidences.rows.map((row) => row.variantRsId)
    );
    expect(json.rows.map((row) => row.diseaseId)).toEqual(
      evidences.rows.map((row) => row.diseaseId)
    );
    expect(json.rows.map((row) => row.reviewStatus)).toEqual(
      evidences.rows.map((row) => row.confidence)
    );
    expect(json.rows.map((row) => row.clinicalSignificances)).toEqual(
      evidences.rows.map((row) => row.clinicalSignificances)
    );

    expect(json.rows.map((row) => row.clinvarId)).toEqual(evidences.rows.map((row) => row.studyId));
    expect(json.rows.map((row) => row.directionOnTarget)).toEqual(
      evidences.rows.map((row) => row.directionOnTarget)
    );
    expect(json.rows.map((row) => row.directionOnTrait)).toEqual(
      evidences.rows.map((row) => row.directionOnTrait)
    );
    expect(json.rows.map((row) => row.score)).toEqual(evidences.rows.map((row) => row.score));

    const tsv = await section.controls.downloadTsv();
    expect(tsv.filename).toBe("eva-evidence.tsv");
    expect(tsv.header).toEqual(columns);
    const lines = tsv.lines.filter((line) => line.join("").length > 0);
    expect(lines).toHaveLength(evidences.count);
    expect(lines.map((line) => line[2])).toEqual(evidences.rows.map((row) => row.variantId));
  });

  test("the export carries the HGVS id of every variant", async ({ page }) => {
    const { section, evidences } = await open(page, FEW);
    const json = await section.controls.downloadJson();
    expect(json.rows.map((row) => row.variantHgvsId)).toEqual(
      evidences.rows.map((row) => row.variantHgvsId)
    );
  });

  test("the API query drawer is loaded with the section's query and target", async ({ page }) => {
    const { section } = await open(page, FEW);
    // GraphiQL builds its schema from the introspection response; wait for it so that a schema it
    // cannot parse is caught while the test is still running.
    const schema = page.waitForResponse((response) =>
      (response.request().postData() ?? "").includes("IntrospectionQuery")
    );
    await section.controls.openApiQuery(EVIDENCE_EVA_OPERATION, FEW.ensgId);
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

  test("a pair without ClinVar records has no ClinVar section", async ({ page }) => {
    await new EvidencePage(page).goto(NONE.ensgId, NONE.efoId);
    await expectSectionLoaded(page, "gwas-credible-sets");
    await expect(sectionLocator(page, EvidenceEvaSection.id)).toHaveCount(0);
  });
});
