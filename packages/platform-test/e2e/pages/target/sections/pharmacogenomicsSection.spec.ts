import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import {
  PGX_EVIDENCE_LEVELS,
  TARGET_PGX_COLUMNS,
  TARGET_PGX_OPERATION,
  TargetPharmacogenomicsSection,
} from "../../../../POM/objects/widgets/Target/targetPharmacogenomicsSection";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { requireTarget, TargetPage, targetIdentity, targetWidget } from "../../../../POM/page/target";
import { expectSections } from "../../../../utils/sections";

type PgxData = { target: { pharmacogenomics: { count: number } } };

const NA = "N/A";
const LEVEL = /^Level (1A|1B|2A|2B|3|4)$/;
const CATEGORIES = ["dosage", "efficacy", "metabolism/pk", "other", "toxicity"];
const VARIANT_HREF = /^\/variant\/(\d{1,2}|X|Y|MT)_\d+_[ACGT]+_[ACGT]+$/;
const LITERATURE_LABEL = /^(\d{5,}|\d+ publications)$/;

/** Rank of a level label ("Level 1A") in the order the table sorts by (strongest first). */
const levelRank = (text: string): number => PGX_EVIDENCE_LEVELS.indexOf(text.replace("Level ", "") as never);

function expectOrdered(values: number[], direction: "ascending" | "descending", what: string): void {
  const sorted = [...values].sort((a, b) => (direction === "ascending" ? a - b : b - a));
  expect(values, `${what} should be in ${direction} order`).toEqual(sorted);
}

/**
 * Target profile > Pharmacogenetics (packages/sections/src/target/Pharmacogenomics).
 *
 * BRAF has no pharmacogenetics. CYP2C19 has hundreds of rows (star alleles, genotypes and
 * rows without either, every confidence level); EGFR has rsIDs, genotypes, ProtVar
 * consequences and rows where the gene is the direct drug target. The API cannot sort or
 * search this field, so the table downloads every row, sorts and searches in the browser
 * and pages through the result ten at a time.
 */
test.describe("Target pharmacogenetics section", () => {
  // Publication drawers query Europe PMC from the browser; keep that third party out.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows its title, description, source link, columns and controls", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const { symbol } = targetIdentity(ensgId);
    const pgx = new TargetPharmacogenomicsSection(page);

    const response = waitForOperation<PgxData>(page, TARGET_PGX_OPERATION);
    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    const { data, variables } = await response;

    expect(variables).toMatchObject({ ensemblId: ensgId, index: 0, size: 10 });
    await expect(pgx.title).toHaveText("Pharmacogenetics");
    await expect(pgx.description).toHaveText(
      `Genetic variants in ${symbol} that have been associated with drug response (Gene may not be direct target of the drug). Source: ClinPGx.`
    );
    await expect(pgx.description.locator("strong")).toHaveText(symbol);
    const source = pgx.descriptionLink("ClinPGx");
    await expect(source).toHaveAttribute("href", "https://www.pharmgkb.org/");
    await expect(source).toHaveAttribute("target", "_blank");

    await pgx.table.expectHeaders(TARGET_PGX_COLUMNS);
    await expect(pgx.table.searchInput).toBeVisible();
    await expect(pgx.table.columnsButton).toBeVisible();
    await expect(pgx.table.exportButton).toHaveText("Export");
    await expect(pgx.table.apiQueryButton).toBeVisible();

    const total = data.target.pharmacogenomics.count;
    expect(total, "CYP2C19 is the config's target with many pharmacogenetics rows").toBeGreaterThan(20);
    await pgx.table.expectPosition(1, 10, total);
    await expect(pgx.table.rows).toHaveCount(10);
  });

  test("the page renders exactly the sections recorded for the target, pharmacogenetics among them", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const target = new TargetPage(page);

    await target.goto(ensgId);
    await expectSections(page, expectedSectionsFor(ensgId));
    await expect(target.summaryChip(targetWidget("pharmacogenetics"))).toHaveCSS("cursor", "pointer");
  });

  test("every row of the first page has well-formed cells in each column", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    await expect(pgx.table.rows).toHaveCount(10);

    for (let row = 0; row < 10; row++) {
      const rsId = pgx.cell(row, "rsId");
      await expect(rsId).toHaveText(/^(rs\d+|N\/A)$/);

      await expect(pgx.cell(row, "starAllele")).toHaveText(/^(\S.*)$/);

      const genotype = pgx.cell(row, "genotypeId");
      await expect(genotype).toHaveText(/\S/);

      const drugs = pgx.cell(row, "drugs");
      await expect(drugs).toHaveText(/\S/);
      for (const link of await drugs.getByRole("link").all()) {
        await expect(link).toHaveAttribute("href", /^\/drug\/CHEMBL\d+$/);
      }

      await expect(pgx.cell(row, "phenotype")).toHaveText(/\S/);
      await expect(pgx.cell(row, "category")).toHaveText(new RegExp(`^(${CATEGORIES.join("|")})$`));
      await expect(pgx.cell(row, "directTarget").locator("svg")).toHaveCount(1);
      await expect(pgx.cell(row, "confidence")).toHaveText(LEVEL);

      const source = pgx.cell(row, "source").getByRole("link", { name: "ClinPGx", exact: true });
      await expect(source).toHaveAttribute(
        "href",
        /^https:\/\/www\.pharmgkb\.org\/clinicalAnnotation\/\d+$/
      );
      await expect(source).toHaveAttribute("target", "_blank");

      await expect(pgx.cell(row, "literature").getByTestId("publications-drawer-trigger")).toHaveText(
        LITERATURE_LABEL
      );
    }
  });

  test("rows without an rsID, genotype or consequence show N/A, and star alleles link to ClinPGx", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    // CYP2C19 is annotated mostly by star allele, so the first page has such a row
    const starRow = pgx.table.rows.filter({ hasText: /CYP2C19\*\d+/ }).first();
    await expect(starRow).toBeVisible();
    const cells = starRow.locator("td");
    await expect(cells.nth(0)).toHaveText(NA);
    await expect(cells.nth(2)).toHaveText(NA);
    await expect(cells.nth(3)).toHaveText(NA);
    const starAllele = cells.nth(1).getByRole("link");
    await expect(starAllele).toHaveText(/^CYP2C19\*\d+$/);
    await expect(starAllele).toHaveAttribute("href", /^https:\/\/www\.pharmgkb\.org\/haplotype\/PA\d+$/);
    await expect(starAllele).toHaveAttribute("target", "_blank");
    await expect(cells.nth(8).locator("svg[data-icon='circle-xmark']")).toHaveCount(1);
  });

  test("the first page is sorted by confidence level and the sort spans every page", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    const total = await pgx.table.total();

    const first = (await pgx.columnTexts("confidence")).map(levelRank);
    expectOrdered(first, "ascending", "levels on the first page");
    expect(first[0], "the strongest evidence is listed first").toBe(0);

    await pgx.table.lastPageButton.click();
    await pgx.table.expectLastPage();
    const last = (await pgx.columnTexts("confidence")).map(levelRank);
    expectOrdered(last, "ascending", "levels on the last page");
    expect(
      last[last.length - 1],
      "the last row of the last page holds the weakest evidence: the sort covers every row"
    ).toBeGreaterThan(first[first.length - 1]);
    expect(total).toBeGreaterThan(10);
  });

  test("clicking the Confidence Level header reverses the order for the whole table", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    const total = await pgx.table.total();
    const ascending = await pgx.table.rowTexts();

    await pgx.header("confidence").getByText("Confidence Level").click();
    await pgx.table.expectRowsChangedFrom(ascending);
    await pgx.table.expectPosition(1, 10, total);
    const desc = (await pgx.columnTexts("confidence")).map(levelRank);
    expectOrdered(desc, "descending", "levels after sorting descending");
    expect(desc[0], "the weakest evidence now leads").toBeGreaterThan(0);

    await pgx.table.lastPageButton.click();
    await pgx.table.expectLastPage();
    const lastDesc = (await pgx.columnTexts("confidence")).map(levelRank);
    expectOrdered(lastDesc, "descending", "levels on the last page");
    expect(lastDesc[lastDesc.length - 1], "the strongest evidence now closes the table").toBe(0);
  });

  test("pagination walks to the last page and back, disabling the right buttons", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    const total = await pgx.table.total();
    const firstPage = await pgx.table.rowTexts();
    await pgx.table.expectFirstPage();

    await pgx.table.nextPageButton.click();
    await pgx.table.expectPosition(11, 20, total);
    await pgx.table.expectRowsChangedFrom(firstPage);
    await expect(pgx.table.firstPageButton).toBeEnabled();
    await expect(pgx.table.previousPageButton).toBeEnabled();

    await pgx.table.lastPageButton.click();
    await pgx.table.expectLastPage();
    const lastRows = total % 10 === 0 ? 10 : total % 10;
    await pgx.table.expectPosition(total - lastRows + 1, total, total);
    await expect(pgx.table.rows).toHaveCount(lastRows);

    await pgx.table.previousPageButton.click();
    await pgx.table.expectPosition(total - lastRows - 9, total - lastRows, total);
    await expect(pgx.table.rows).toHaveCount(10);

    await pgx.table.firstPageButton.click();
    await pgx.table.expectFirstPage();
    await pgx.table.expectPosition(1, 10, total);
    await pgx.table.expectRowTexts(firstPage);
  });

  test("the page size changes how many rows show and returns to the first page", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    const total = await pgx.table.total();
    const firstPage = await pgx.table.rowTexts();

    await expect(pgx.table.pageSizeSelect).toHaveValue("10");
    await expect(pgx.table.pageSizeSelect.locator("option")).toHaveText(["10", "25", "100"]);

    await pgx.table.nextPageButton.click();
    await pgx.table.expectPosition(11, 20, total);

    await pgx.table.setPageSize(25);
    await pgx.table.expectPosition(1, 25, total);
    await expect(pgx.table.rows).toHaveCount(25);
    expect((await pgx.table.rowTexts()).slice(0, 10)).toEqual(firstPage);

    await pgx.table.setPageSize(100);
    await pgx.table.expectPosition(1, 100, total);
    await expect(pgx.table.rows).toHaveCount(100);
    await pgx.table.expectFirstPage();
  });

  test("searching looks through every row, and a term with no match empties the table", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    const total = await pgx.table.total();

    // pick a drug that is not on the first page
    await pgx.table.lastPageButton.click();
    await pgx.table.expectLastPage();
    const drug = (await pgx.cell(0, "drugs").getByRole("link").first().innerText()).trim();
    expect(drug).toMatch(/\S{4,}/);

    await pgx.table.search(drug);
    await expect(pgx.table.pagePosition, "the search should narrow the table").not.toHaveText(
      new RegExp(` of ${total}$`)
    );
    const matching = await pgx.table.total();
    expect(matching).toBeGreaterThan(0);
    expect(matching).toBeLessThan(total);
    await expect(pgx.table.rows.first()).toContainText(drug, { ignoreCase: true });
    await pgx.table.expectFirstPage(matching <= 10);

    await pgx.table.search("no pharmacogenetic annotation matches this");
    await expect(pgx.table.rows).toHaveCount(0);
    await expect(pgx.table.pagePosition).toHaveText(/ of 0$/);

    await pgx.table.search("");
    await pgx.table.expectPosition(1, 10, total);
    await expect(pgx.table.rows).toHaveCount(10);
  });

  test("a drug links to its page and a hover previews it", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    const drugLink = pgx.cell(0, "drugs").getByRole("link").first();
    const href = (await drugLink.getAttribute("href")) ?? "";
    expect(href).toMatch(/^\/drug\/CHEMBL\d+$/);

    await drugLink.hover();
    await expect(pgx.tooltip).toContainText(href.slice(1));

    await drugLink.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-block")).toBeVisible();
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(/\S/);
  });

  test("the phenotype carries the annotation text in a tooltip, and header help explains its columns", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    await pgx.cell(0, "phenotype").hover();
    await expect(
      pgx.tooltip.filter({ hasText: /CYP2C19/ }),
      "the tooltip should hold the genotype annotation text of the row"
    ).toBeVisible();

    await pgx.header("genotypeId").getByText("?", { exact: true }).hover();
    const genotypeHelp = pgx.tooltip.filter({ hasText: "VCF-style(chr_pos_ref_allele1,allele2)" });
    await expect(genotypeHelp).toBeVisible();
    await expect(genotypeHelp.getByRole("link", { name: "here" })).toHaveAttribute(
      "href",
      "https://github.com/apriltuesday/opentargets-pharmgkb/tree/issue-18#variant-coordinate-computation"
    );

    await pgx.header("confidence").getByText("?", { exact: true }).hover();
    const confidenceHelp = pgx.tooltip.filter({ hasText: "As defined by" });
    await expect(confidenceHelp).toBeVisible();
    await expect(confidenceHelp.getByRole("link", { name: "PharmGKB ClinAnn Levels" })).toHaveAttribute(
      "href",
      "https://www.pharmgkb.org/page/clinAnnLevels"
    );
  });

  test("the directionality drawer lists the annotations of the row that was clicked", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    const trigger = pgx.directionalityTriggers.first();
    await expect(trigger).toHaveText(/^\s*\d+ (entry|entries)\s*$/);
    const count = Number((await trigger.innerText()).trim().split(" ")[0]);
    const row = pgx.table.rows.filter({ has: trigger }).first();
    const drug = (await row.locator("td").nth(4).innerText()).trim();

    await trigger.click();
    await expect(pgx.directionalityDrawer).toBeVisible();
    await expect(pgx.directionalityDrawer).toContainText("Directionality");
    const descriptions = pgx.directionalityDrawer.getByText("Description:");
    await expect(descriptions.first()).toBeVisible();
    expect(await descriptions.count(), "the drawer lists at most one page of annotations").toBeLessThanOrEqual(count);
    await expect(pgx.directionalityDrawer).toContainText(new RegExp(drug.split(/[\s,]/)[0], "i"));
    const publication = pgx.directionalityDrawer.getByRole("link").first();
    await expect(publication).toHaveAttribute("target", "_blank");
    await expect(publication).toHaveAttribute("href", /\d{5,}/);

    await pgx.closeDirectionalityDrawer();
  });

  test("the literature drawer lists the publications of the row that was clicked", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    const many = pgx.literatureTriggers.filter({ hasText: /^\s*\d+ publications\s*$/ }).first();
    await expect(many).toBeVisible();
    const count = Number((await many.innerText()).trim().split(" ")[0]);
    expect(count).toBeGreaterThan(1);

    await many.click();
    await pgx.publicationsDrawer.expectOpen();
    // the drawer pages its list; the first page is full when there are many
    await expect(pgx.publicationsDrawer.entries).toHaveCount(Math.min(count, 10));
    await expect(pgx.publicationsDrawer.entries.first()).toContainText("Stubbed publication");
    await pgx.publicationsDrawer.close();
  });

  test("a row with a single publication labels the button with its PubMed id", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    await pgx.table.setPageSize(100);
    await expect(pgx.table.rows).toHaveCount(100);

    const single = pgx.literatureTriggers.filter({ hasText: /^\s*\d{5,}\s*$/ }).first();
    await expect(single).toBeVisible();
    const pmid = (await single.innerText()).trim();

    await single.click();
    await pgx.publicationsDrawer.expectOpen();
    await expect(pgx.publicationsDrawer.entries).toHaveCount(1);
    await expect(pgx.publicationsDrawer.entry(pmid)).toContainText(`Stubbed publication ${pmid}`);
    await pgx.publicationsDrawer.close();
  });

  test("columns can be hidden and shown, except the rsID", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    const picker = await pgx.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(TARGET_PGX_COLUMNS.length);
    await expect(picker.getByRole("checkbox", { name: "rsID", exact: true })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Star Allele", exact: true }).uncheck();
    await picker.getByRole("checkbox", { name: "Source", exact: true }).uncheck();
    await expect(pgx.table.headers).toHaveCount(TARGET_PGX_COLUMNS.length - 2);
    await expect(pgx.table.headers.filter({ hasText: /^Star Allele$/ })).toHaveCount(0);
    await expect(pgx.table.rows.first().locator("td")).toHaveCount(TARGET_PGX_COLUMNS.length - 2);

    await picker.getByRole("checkbox", { name: "Star Allele", exact: true }).check();
    await picker.getByRole("checkbox", { name: "Source", exact: true }).check();
    await pgx.table.expectHeaders(TARGET_PGX_COLUMNS);
    await pgx.table.closeColumnPicker(pgx.title);
  });

  test("the export downloads every row as TSV and JSON, not just the page shown", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    const total = await pgx.table.total();

    const tsv = await pgx.table.download("TSV");
    expect(tsv.filename).toBe(`${ensgId}-pharmacogenomics-target.tsv`);
    const { header, rows } = parseTsv(tsv.text);
    expect(header).toContain("evidenceLevel");
    expect(header).toContain("genotypeId");
    expect(rows).toHaveLength(total);
    const level = header.indexOf("evidenceLevel");
    for (const row of rows) expect(row[level]).toMatch(/^(1A|1B|2A|2B|3|4)$/);

    const json = await pgx.table.download("Json");
    expect(json.filename).toBe(`${ensgId}-pharmacogenomics-target.json`);
    expect(JSON.parse(json.text)).toHaveLength(total);
  });

  test("the API query drawer shows the query behind the section", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    await pgx.table.expectApiQuery(TARGET_PGX_OPERATION);
  });

  test("a target where the gene is the direct drug target shows ticks, rsIDs and genotype links", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "withDirectTargetPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
    await pgx.table.pageSizeSelect.selectOption("100");
    await expect(pgx.table.rows.first()).toBeVisible();

    await pgx.table.expectHeaders(TARGET_PGX_COLUMNS);
    await expect(pgx.column("directTarget").locator("svg[data-icon='circle-check']").first()).toBeVisible();
    await expect(pgx.column("directTarget").locator("svg[data-icon='circle-xmark']").first()).toBeVisible();

    const rsId = pgx.cell(0, "rsId").getByRole("link");
    const rs = (await rsId.innerText()).trim();
    expect(rs).toMatch(/^rs\d+$/);
    await expect(rsId).toHaveAttribute(
      "href",
      `https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${rs}`
    );
    await expect(rsId).toHaveAttribute("target", "_blank");

    const genotype = pgx.cell(0, "genotypeId").getByRole("link");
    await expect(genotype).toHaveAttribute("href", VARIANT_HREF);

    const consequence = pgx.cell(0, "consequence");
    await expect(consequence).toContainText("VEP");
    await expect(consequence.getByRole("link").first()).toHaveAttribute(
      "href",
      /^https:\/\/identifiers\.org\/SO:\d{7}$/
    );
  });

  test("a genotype opens the variant page", async ({ page, testConfig }) => {
    const ensgId = requireTarget(testConfig, "withDirectTargetPharmacogenomics");
    const pgx = new TargetPharmacogenomicsSection(page);

    await new TargetPage(page).goto(ensgId);
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();

    const link = pgx.cell(0, "genotypeId").getByRole("link");
    const href = (await link.getAttribute("href")) ?? "";
    expect(href).toMatch(VARIANT_HREF);

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-block")).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/target/${ensgId}`));
    await pgx.expectLoaded();
    await pgx.table.expectLoaded();
  });

  test("a target without pharmacogenetics does not render the section", async ({
    page,
    testConfig,
  }) => {
    const ensgId = requireTarget(testConfig, "primary");
    const sectionsWithData = expectedSectionsFor(ensgId);
    const pgx = new TargetPharmacogenomicsSection(page);
    const target = new TargetPage(page);

    expect(sectionsWithData, "the manifest should record the primary target without pharmacogenetics").not.toContain(
      "pharmacogenetics"
    );
    await target.goto(ensgId);
    await expectSections(page, sectionsWithData);

    await expect(pgx.section).toHaveCount(0);
    await expect(target.summaryChip(targetWidget("pharmacogenetics"))).toHaveCSS("cursor", "auto");
  });
});
