import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { QTLStudyHeader } from "../../../POM/objects/components/StudyProfileHeader/qtlStudyHeader";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import {
  QTL_COLUMNS,
  QTLCredibleSetsSection,
} from "../../../POM/objects/widgets/Study/qtlCredibleSetsSection";
import { expectSections, sectionLocator } from "../../../utils/sections";

const PQTL = {
  id: "UKB_PPP_EUR_LPA_P08519_OID30747_v1",
  gene: { symbol: "LPA", id: "ENSG00000198670" },
  biosample: "blood plasma",
};
const EQTL = {
  gene: { symbol: "PCSK9", id: "ENSG00000169174" },
  biosample: "tibial nerve",
};
const PAGE_SIZE = 10;
const VARIANT_ID = /^(\d+|X|Y|MT)_\d+_[ACGT]+_[ACGT]+$/;
const P_VALUE = /^\d\.\d\d ?×10 ?-?\d+$/;
const FINE_MAPPING_METHODS = /^(SuSiE|SuSiE-inf|FINEMAP|COJO|PICS|LD clumping)/;

test.describe("QTL study page: manifest", () => {
  test(
    "renders the molQTL credible sets section and none of the GWAS-only sections",
    { tag: "@smoke" },
    async ({ page, testConfig }) => {
      const studyId = testConfig.study.qtl?.primary as string;
      expect(studyId).toBe(PQTL.id);
      await page.goto(`/study/${studyId}`);
      await expectSections(page, expectedSectionsFor(studyId));
      await expect(sectionLocator(page, "gwas-credible-sets")).toHaveCount(0);
      await expect(sectionLocator(page, "shared-trait-studies")).toHaveCount(0);
      await expect(page.getByTestId("summary-qtlcrediblesets")).toBeVisible();
      await expect(page.getByTestId("summary-gwascrediblesets")).toHaveCount(0);
    }
  );

  test("eQTL study renders the same single section", async ({ page, testConfig }) => {
    const studyId = testConfig.study.qtl?.alternatives?.[0] as string;
    await page.goto(`/study/${studyId}`);
    await expectSections(page, expectedSectionsFor(studyId));
  });
});

test.describe("QTL study page: header of a pQTL study", () => {
  test("title bar, source link and profile tab", async ({ page }) => {
    const header = new QTLStudyHeader(page);
    await header.goto(PQTL.id);
    await expect(page).toHaveURL(new RegExp(`/study/${PQTL.id}$`));
    await expect(header.title).toHaveText(PQTL.id);
    await expect(header.sourceLink).toHaveText("UKB-PPP");
    await expect(header.sourceLink).toHaveAttribute(
      "href",
      "https://www.synapse.org/Synapse:syn51364943/wiki/622119"
    );
    await expect(header.profileTab).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveTitle(new RegExp(PQTL.id));
  });

  test("type, project, sample size, summary statistics and LD population", async ({ page }) => {
    const header = new QTLStudyHeader(page);
    await header.goto(PQTL.id);

    await expect(header.studyType).toHaveText(/^Study type:\s*pQTL$/);
    await expect(header.project).toHaveText(/^Project:\s*UKB PPP EUR$/);
    await expect(header.sampleSize).toHaveText(/^Sample size:\s*\d{1,3}(,\d{3})+$/);
    await expect(header.summaryStatistics).toHaveText(/^Summary statistics:\s*Available$/);

    await test.step("LD reference population chip", async () => {
      await expect(header.populationChips).toHaveCount(1);
      const chip = page.getByTestId("chip-ld-population-nfe");
      await expect(chip).toHaveText(/^NFE\s*100%$/);
      await chip.hover();
      await expect(page.getByRole("tooltip")).toHaveText(
        "LD reference population: non-Finnish Europeans"
      );
    });

    await test.step("fields that do not apply to this study are not rendered", async () => {
      await expect(header.gwasOnlyFields).toHaveCount(0);
      await expect(header.condition).toHaveCount(0);
      await expect(header.publication).toHaveCount(0);
      await expect(header.pubmed).toHaveCount(0);
    });
  });

  test("QC warnings popover lists the warning and closes", async ({ page }) => {
    const header = new QTLStudyHeader(page);
    await header.goto(PQTL.id);
    await expect(header.qcWarnings).toContainText("QC warnings");
    const content = await header.openQcWarnings();
    await expect(content.getByRole("listitem")).toHaveText([
      "Study has non empty or zero nSamples with empty nCases and nControls",
    ]);
    await page.keyboard.press("Escape");
    await expect(content).toBeHidden();
  });

  test("affected gene is the study's target and links to its page", async ({ page }) => {
    const header = new QTLStudyHeader(page);
    await header.goto(PQTL.id);
    await expect(header.affectedGene).toContainText("Affected gene:");
    await expect(
      header.affectedGene,
      "the field must show the gene, not a placeholder"
    ).not.toContainText("?API?");
    const link = header.affectedGene.getByRole("link", { name: PQTL.gene.symbol });
    await expect(link).toHaveAttribute("href", `/target/${PQTL.gene.id}`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/target/${PQTL.gene.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toContainText(PQTL.gene.symbol);
  });

  test("affected cell/tissue shows the study's biosample", async ({ page }) => {
    const header = new QTLStudyHeader(page);
    await header.goto(PQTL.id);
    await expect(header.affectedCellTissue).toBeVisible();
    await expect(
      header.affectedCellTissue,
      "the field must show the biosample, not a placeholder"
    ).not.toContainText("?API?");
    await expect(header.affectedCellTissue).toContainText(PQTL.biosample);
  });
});

test.describe("QTL study page: header of an eQTL study", () => {
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("type, project, condition, sample size and no LD population", async ({
    page,
    testConfig,
  }) => {
    const studyId = testConfig.study.qtl?.alternatives?.[0] as string;
    const header = new QTLStudyHeader(page);
    await header.goto(studyId);

    await expect(header.title).toHaveText(studyId);
    await expect(header.sourceLink).toHaveText("eQTL Catalog");
    await expect(header.sourceLink).toHaveAttribute("href", "https://www.ebi.ac.uk/eqtl/Studies/");
    await expect(header.studyType).toHaveText(/^Study type:\s*eQTL$/);
    await expect(header.project).toHaveText(/^Project:\s*GTEx v10$/);
    await expect(header.condition).toHaveText(/^Condition:\s*naive$/);
    await expect(header.sampleSize).toHaveText(/^Sample size:\s*\d{1,3}(,\d{3})*$/);
    await expect(header.summaryStatistics).toHaveText(/^Summary statistics:\s*Available$/);
    await expect(header.populationChips).toHaveCount(0);
    await expect(header.gwasOnlyFields).toHaveCount(0);
  });

  test("PubMed id opens the publications drawer", async ({ page, testConfig }) => {
    const studyId = testConfig.study.qtl?.alternatives?.[0] as string;
    const header = new QTLStudyHeader(page);
    await header.goto(studyId);
    await expect(header.pubmed).toHaveText(/^PubMed:\s*32913098\s*$/);
    await header.pubmed.getByTestId("publications-drawer-trigger").click();
    const drawer = page.getByTestId("publications-drawer");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Stubbed publication 32913098");
    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
  });

  test("affected gene and cell/tissue show the study's target and biosample", async ({
    page,
    testConfig,
  }) => {
    const studyId = testConfig.study.qtl?.alternatives?.[0] as string;
    const header = new QTLStudyHeader(page);
    await header.goto(studyId);
    await expect(header.affectedGene).not.toContainText("?API?");
    await expect(header.affectedGene.getByRole("link", { name: EQTL.gene.symbol })).toHaveAttribute(
      "href",
      `/target/${EQTL.gene.id}`
    );
    await expect(header.affectedCellTissue).not.toContainText("?API?");
    await expect(header.affectedCellTissue).toContainText(EQTL.biosample);
  });
});

test.describe("QTL study page: molQTL credible sets table", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/study/${PQTL.id}`);
  });

  test("title, description and exact columns", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    await expect(section.title).toHaveText("molQTL Credible Sets");
    await expect(section.description).toContainText(
      `molQTL credible sets associated with study ${PQTL.id}.`
    );
    await expect(section.description.getByRole("link", { name: "eQTL Catalog" })).toHaveAttribute(
      "href",
      "https://www.ebi.ac.uk/eqtl/"
    );
    await expect(section.description.getByRole("link", { name: "UKB-PPP" })).toHaveAttribute(
      "href",
      "https://www.synapse.org/Synapse:syn51364943/wiki/622119"
    );
    await expect(section.headers).toHaveText(
      QTL_COLUMNS.map((name) => new RegExp(`^${name}\\??$`))
    );
  });

  test("a full first page whose rows have well-formed content", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    const total = await section.total();
    expect(total, "the study has more than one page of credible sets").toBeGreaterThan(PAGE_SIZE);
    await section.expectPosition(1, PAGE_SIZE, total);
    await section.expectPaging({ back: false, forward: true });
    await expect(section.rows).toHaveCount(PAGE_SIZE);

    for (let i = 0; i < PAGE_SIZE; i++) {
      const [view, variant, pValue, beta, method, , size] = await section.rowText(i);
      expect(view, `row ${i} credible set`).toBe("View");
      expect(variant, `row ${i} lead variant`).toMatch(VARIANT_ID);
      expect(pValue, `row ${i} p-value`).toMatch(P_VALUE);
      expect(beta, `row ${i} beta`).toMatch(/^-?\d+(\.\d+)?(e-?\d+)?$/);
      expect(method, `row ${i} method`).toMatch(FINE_MAPPING_METHODS);
      expect(size, `row ${i} size`).toMatch(/^\d{1,3}(,\d{3})*$/);
      await expect(section.credibleSetLink(i)).toHaveAttribute(
        "href",
        /^\/credible-set\/[0-9a-f]{32}$/
      );
      await expect(section.variantLink(i)).toHaveAttribute("href", `/variant/${variant}`);
      await expect(section.cell(i, 5).locator("svg").first()).toBeVisible();
    }

    const credibleSetHrefs = await section.rows.evaluateAll((rows) =>
      rows.map((row) => row.querySelector("a[href^='/credible-set/']")?.getAttribute("href"))
    );
    expect(new Set(credibleSetHrefs).size, "no credible set is listed twice").toBe(PAGE_SIZE);
  });

  test("header tooltips explain beta and fine-mapping confidence", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();

    const betaTip = await section.hoverHeader(/^Beta/);
    await expect(betaTip).toHaveText("Beta with respect to the ALT allele");

    const confidenceTip = await section.hoverHeader(/^Fine-mapping confidence/);
    await expect(confidenceTip).toContainText(
      "Fine-mapping confidence based on the suitability of the linkage-disequilibrium information and fine-mapping method."
    );
    await expect(confidenceTip.getByRole("link", { name: "here" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/credible-set#credible-set-confidence"
    );
  });

  test("confidence stars carry a tooltip", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    await section.cell(0, 5).locator("svg").first().hover();
    await expect(page.getByRole("tooltip")).toHaveText(/\S/);
  });

  test("paging forward and back shows different rows and disables the right buttons", async ({
    page,
  }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    const total = await section.total();
    expect(total, "needs more than two pages to reach the end").toBeGreaterThan(2 * PAGE_SIZE);
    const first = await section.allRowTexts();

    await section.goNext(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
    await section.expectPaging({ back: true, forward: true });
    await expect.poll(() => section.allRowTexts()).not.toEqual(first);
    await expect(section.rows).toHaveCount(PAGE_SIZE);
    for (const variant of await section.columnTexts(1)) expect(variant).toMatch(VARIANT_ID);

    const lastStart = 2 * PAGE_SIZE + 1;
    await section.goNext(lastStart, Math.min(3 * PAGE_SIZE, total), total);
    await expect(section.rows).toHaveCount(Math.min(PAGE_SIZE, total - 2 * PAGE_SIZE));
    await section.expectPaging({ back: true, forward: total > 3 * PAGE_SIZE });

    await section.firstPageButton.click();
    await section.expectPosition(1, PAGE_SIZE, total);
    await section.expectPaging({ back: false, forward: true });
    await expect.poll(() => section.allRowTexts()).toEqual(first);

    await section.goNext(PAGE_SIZE + 1, 2 * PAGE_SIZE, total);
    await section.previousPageButton.click();
    await section.expectPosition(1, PAGE_SIZE, total);
  });

  test("page size changes the number of rows and the footer", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    const total = await section.total();

    await section.setPageSize(25);
    await section.expectPosition(1, Math.min(25, total), total);
    await expect(section.rows).toHaveCount(Math.min(25, total));
    await section.expectPaging({ back: false, forward: total > 25 });

    await section.setPageSize(100);
    await section.expectPosition(1, Math.min(100, total), total);
    await expect(section.rows).toHaveCount(Math.min(100, total));

    await section.setPageSize(10);
    await section.expectPosition(1, PAGE_SIZE, total);
    await expect(section.rows).toHaveCount(PAGE_SIZE);
  });

  test("column picker hides and restores a column", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    const list = await section.controls.openColumnPicker();
    await expect(list.getByRole("checkbox")).toHaveCount(QTL_COLUMNS.length);
    await list.getByRole("checkbox", { name: "P-value" }).uncheck();
    await expect(section.headers).toHaveCount(QTL_COLUMNS.length - 1);
    await expect(section.headers.filter({ hasText: "P-value" })).toHaveCount(0);
    await expect(section.row(0).locator("td")).toHaveCount(QTL_COLUMNS.length - 1);
    await list.getByRole("checkbox", { name: "P-value" }).check();
    await expect(section.headers).toHaveCount(QTL_COLUMNS.length);
    await section.controls.closeColumnPicker(section.title);
  });

  test("export downloads every credible set as JSON and TSV", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    const total = await section.total();

    const json = await section.controls.download("Json");
    expect(json.filename).toBe(`${PQTL.id}-qtl-credible-sets-studies.json`);
    const rows = JSON.parse(json.text) as Record<string, unknown>[];
    expect(rows, "the export holds every credible set, not just the page").toHaveLength(total);
    expect(Object.keys(rows[0])).toEqual([
      "credibleSet",
      "leadVariant",
      "pValue",
      "beta",
      "fineMappingMethod",
      "fineMappingConfidence",
      "credibleSetSize",
    ]);
    for (const row of rows) expect(String(row.leadVariant)).toMatch(VARIANT_ID);

    const tsv = await section.controls.download("TSV");
    expect(tsv.filename).toBe(`${PQTL.id}-qtl-credible-sets-studies.tsv`);
    const lines = tsv.text.trim().split("\n");
    expect(lines).toHaveLength(total + 1);
    expect(lines[0].split("\t")).toEqual(expect.arrayContaining(["leadVariant", "credibleSet"]));
  });

  test("API query drawer holds the section's query", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    await section.controls.expectApiQuery("StudyQTLCredibleSetsQuery");
  });

  test("credible set link opens the credible set page and back returns to the study", async ({
    page,
  }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    const variantId = (await section.rowText(0))[1];
    const href = (await section.credibleSetLink(0).getAttribute("href")) ?? "";
    const id = href.replace("/credible-set/", "");
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    await section.credibleSetLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/credible-set/${id}$`));
    const block = page.getByTestId("profile-page-header-block");
    await expect(block).toContainText(`Lead variant: ${variantId}`);
    await expect(block).toContainText(`Study ID: ${PQTL.id}`);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/study/${PQTL.id}(#.*)?$`));
    await section.expectLoaded();
  });

  test("lead variant link opens the variant page", async ({ page }) => {
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    const variantId = (await section.rowText(0))[1];
    expect(variantId).toMatch(VARIANT_ID);
    await section.variantLink(0).click();
    await expect(page).toHaveURL(new RegExp(`/variant/${variantId}$`));
    await expect(page.getByTestId("profile-page-header-text")).toBeVisible();
  });
});

test.describe("QTL study page: study with a single credible set", () => {
  test("one row, footer 1 - 1 of 1 and every paging button disabled", async ({
    page,
    testConfig,
  }) => {
    const studyId = testConfig.study.qtl?.alternatives?.[0] as string;
    await page.goto(`/study/${studyId}`);
    const section = new QTLCredibleSetsSection(page);
    await section.expectLoaded();
    await expect(section.rows).toHaveCount(1);
    await section.expectPosition(1, 1, 1);
    await section.expectPaging({ back: false, forward: false });
    const [view, variant, pValue, , method] = await section.rowText(0);
    expect(view).toBe("View");
    expect(variant).toMatch(VARIANT_ID);
    expect(pValue).toMatch(P_VALUE);
    expect(method).toMatch(FINE_MAPPING_METHODS);
    await expect(section.description).toContainText(studyId);

    const json = await section.controls.download("Json");
    expect(json.filename).toBe(`${studyId}-qtl-credible-sets-studies.json`);
    expect(JSON.parse(json.text)).toHaveLength(1);
  });
});
