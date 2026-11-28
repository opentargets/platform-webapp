import { expect, test } from "../../../fixtures";
import {
  DrugPharmacogenomicsSection,
  PGX_COLUMN,
  PHARMACOGENOMICS_COLUMNS,
} from "../../../POM/objects/widgets/Drug/drugPharmacogenomicsSection";
import { closeDrawer, expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  stubEuropePmc,
  waitForOperation,
} from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DrugPage } from "../../../POM/page/drug/drug";
import { drugFacts, drugIds } from "../../../POM/page/drug/drugData";
import { expectSectionLoaded } from "../../../utils/sections";

/** ClinPGx evidence levels, strongest first: the order an ascending sort must follow. */
const LEVEL_ORDER = ["1A", "1B", "2A", "2B", "3", "4"];
const LEVEL_CELL = /^Level (1A|1B|2A|2B|3|4)$/;
const CATEGORIES = ["efficacy", "toxicity", "dosage", "metabolism/pk", "other"];

const HEADER_PATTERNS = PHARMACOGENOMICS_COLUMNS.map((column) => new RegExp(`^${column}`));

const levelRanks = (cells: string[]): number[] =>
  cells.map((cell) => LEVEL_ORDER.indexOf(cell.replace("Level ", "")));

test.describe("Drug page: Pharmacogenetics", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description, columns and well-formed rows", async ({ page, testConfig }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const pgx = new DrugPharmacogenomicsSection(page);
    const response = waitForOperation<{
      drug: { pharmacogenomics: { rows: { variantId: string | null }[] } };
    }>(page, "DrugPharmacogenomicsQuery");
    await drugPage.goto(primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    const apiRows = (await response).data.drug.pharmacogenomics.rows;

    await test.step("title and description", async () => {
      await expect(drugPage.sectionTitle(DrugPharmacogenomicsSection.id)).toHaveText(
        "Pharmacogenetics"
      );
      await expect(pgx.description).toHaveText(
        `Genetic variants that are associated with the response to ${drugFacts(primary).name} Source: ClinPGx.`
      );
      await expectExternalLink(
        pgx.description.getByRole("link", { name: "ClinPGx" }),
        "https://www.pharmgkb.org/"
      );
    });

    await test.step("columns", async () => {
      await pgx.table.expectHeaders(HEADER_PATTERNS);
    });

    const total = await pgx.table.total();
    expect(total, "trastuzumab has more than one page of annotations").toBeGreaterThan(10);
    await pgx.table.expectRows(10);
    await pgx.table.expectPosition(1, 10, total);
    await pgx.table.expectPaginationState("first");

    await test.step("gene: a target link or N/A", async () => {
      const genes = await pgx.table.columnTexts(PGX_COLUMN.gene);
      for (const gene of genes) expect(gene).toMatch(/^(N\/A|[A-Z0-9][A-Za-z0-9-]*)$/);
      expect(genes).toContain("ERBB2");
      const links = pgx.column(PGX_COLUMN.gene).getByRole("link");
      await expect(links).toHaveCount(genes.filter((gene) => gene !== "N/A").length);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute("href", /^\/target\/ENSG\d{11}$/);
      }
    });

    await test.step("rsID: links to the same variant in Ensembl", async () => {
      const links = pgx.column(PGX_COLUMN.rsId).getByRole("link");
      await expect(links.first()).toBeVisible();
      for (const link of await links.all()) {
        const rsId = (await link.innerText()).trim();
        expect(rsId).toMatch(/^rs\d+$/);
        await expect(link).toHaveAttribute(
          "href",
          `https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${rsId}`
        );
      }
    });

    await test.step("genotype ID: links to the variant page of the row's variantId, or is plain text", async () => {
      expect(apiRows.length, "the API rows of the first page are the table rows").toBe(10);
      let linked = 0;
      for (const [index, apiRow] of apiRows.entries()) {
        const cell = pgx.table.cell(index, PGX_COLUMN.genotypeId);
        const genotype = (await cell.innerText()).replace(/\s+/g, "");
        expect(genotype).toMatch(/^(\d{1,2}|X|Y|MT)_\d+_[ACGT]+_[ACGT]+(,[ACGT]+)?$|^N\/A$/);
        const links = cell.getByRole("link");
        if (apiRow.variantId === null) {
          await expect(links, `${genotype} has no Platform variant: no link`).toHaveCount(0);
        } else {
          linked++;
          await expect(links, `${genotype} has one link`).toHaveCount(1);
          await expect(links).toHaveAttribute("href", `/variant/${apiRow.variantId}`);
        }
      }
      expect(linked, "some rows link to a variant").toBeGreaterThan(0);
    });

    await test.step("variant consequence: a VEP chip linking to the sequence ontology", async () => {
      const chips = pgx.column(PGX_COLUMN.consequence).getByRole("link", { name: /^VEP/ });
      await expect(chips.first()).toBeVisible();
      for (const chip of await chips.all()) {
        await expect(chip).toHaveAttribute("href", /^https:\/\/identifiers\.org\/SO:\d{7}$/);
        await expect(chip.getByTestId("label-chip-value")).not.toBeEmpty();
      }
    });

    await test.step("a missense consequence also links to ProtVar with the variant's coordinates", async () => {
      const missenseRows = pgx.table.rows.filter({ hasText: "Missense variant" });
      await expect(missenseRows.first()).toBeVisible();
      const protVar = missenseRows.first().getByRole("link", { name: "ProtVar" });
      await expect(protVar).toHaveAttribute(
        "href",
        /^https:\/\/www\.ebi\.ac\.uk\/ProtVar\/query\?chromosome=\w+&genomic_position=\d+&reference_allele=[ACGT]+&alternative_allele=[ACGT]+$/
      );
    });

    await test.step("category, confidence level, source", async () => {
      for (const category of await pgx.table.columnTexts(PGX_COLUMN.category)) {
        expect(CATEGORIES).toContain(category);
      }
      for (const level of await pgx.table.columnTexts(PGX_COLUMN.confidence)) {
        expect(level).toMatch(LEVEL_CELL);
      }
      const sources = pgx.column(PGX_COLUMN.source).getByRole("link", { name: "ClinPGx" });
      await expect(sources).toHaveCount(10);
      for (const source of await sources.all()) {
        await expect(source).toHaveAttribute(
          "href",
          /^https:\/\/www\.pharmgkb\.org\/clinicalAnnotation\/\d+$/
        );
      }
    });

    await test.step("direct drug target: a tick for the drug's own target, a cross otherwise", async () => {
      const erbb2 = pgx.table.rows.filter({
        has: page.getByRole("link", { name: "ERBB2", exact: true }),
      });
      const bard1 = pgx.table.rows.filter({
        has: page.getByRole("link", { name: "BARD1", exact: true }),
      });
      await expect(
        erbb2
          .first()
          .locator("td")
          .nth(PGX_COLUMN.directTarget)
          .locator("svg[data-icon='circle-check']")
      ).toBeVisible();
      await expect(
        bard1
          .first()
          .locator("td")
          .nth(PGX_COLUMN.directTarget)
          .locator("svg[data-icon='circle-xmark']")
      ).toBeVisible();
      await expect(pgx.column(PGX_COLUMN.directTarget).locator("svg")).toHaveCount(10);
    });

    await test.step("page size options", async () => {
      await expect(pgx.table.pageSizeSelect).toHaveValue("10");
      await expect(pgx.table.pageSizeSelect.getByRole("option")).toHaveText(["10", "25", "100"]);
    });
  });

  test("header and phenotype tooltips explain the columns", async ({ page, testConfig }) => {
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);

    await test.step("Genotype ID", async () => {
      await pgx.table.headers.nth(PGX_COLUMN.genotypeId).locator("sup").hover();
      const tooltip = page.getByRole("tooltip").filter({ hasText: "VCF-style" });
      await expect(tooltip).toContainText("VCF-style(chr_pos_ref_allele1,allele2)");
      await expect(tooltip.getByRole("link", { name: "here" })).toHaveAttribute(
        "href",
        /^https:\/\/github\.com\/apriltuesday\/opentargets-pharmgkb\//
      );
    });

    await test.step("Confidence Level", async () => {
      await pgx.confidenceHeader.locator("sup").hover();
      const tooltip = page.getByRole("tooltip").filter({ hasText: "As defined by" });
      await expect(tooltip.getByRole("link", { name: "ClinPGx ClinAnn Levels" })).toHaveAttribute(
        "href",
        "https://www.pharmgkb.org/page/clinAnnLevels"
      );
    });

    await test.step("a phenotype's help icon shows the genotype annotation", async () => {
      const phenotype = pgx.table.cell(0, PGX_COLUMN.phenotype);
      await expect(phenotype).not.toBeEmpty();
      await phenotype.locator("sup").hover();
      await expect(
        page.getByRole("tooltip").filter({ hasText: /genotype/i }),
        "the tooltip holds the annotation of the genotype"
      ).toContainText(/patients .+ trastuzumab/i);
    });
  });

  test("pagination walks through every annotation and page size widens the page", async ({
    page,
    testConfig,
  }) => {
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    const total = await pgx.table.total();
    expect(total).toBeGreaterThan(20);
    expect(total).toBeLessThanOrEqual(100);
    await pgx.table.expectRows(10);
    const firstPage = await pgx.table.rows.allInnerTexts();

    await pgx.table.nextPageButton.click();
    await pgx.table.expectPosition(11, 20, total);
    await pgx.table.expectRows(10);
    await pgx.table.expectPaginationState("middle");
    const secondPage = await pgx.table.rows.allInnerTexts();
    expect(secondPage, "page 2 shows different rows").not.toEqual(firstPage);

    await pgx.table.lastPageButton.click();
    const lastStart = Math.floor((total - 1) / 10) * 10 + 1;
    await pgx.table.expectPosition(lastStart, total, total);
    await pgx.table.expectRows(total - lastStart + 1);
    await pgx.table.expectPaginationState("last");

    await pgx.table.previousPageButton.click();
    await pgx.table.expectPosition(lastStart - 10, lastStart - 1, total);
    await pgx.table.expectRows(10);

    await pgx.table.firstPageButton.click();
    await pgx.table.expectPosition(1, 10, total);
    await pgx.table.expectRows(10);
    expect(await pgx.table.rows.allInnerTexts()).toEqual(firstPage);

    await test.step("page size 100 shows every annotation and resets to the first page", async () => {
      await pgx.table.nextPageButton.click();
      await pgx.table.expectPosition(11, 20, total);
      await pgx.table.pageSizeSelect.selectOption("100");
      await pgx.table.expectPosition(1, total, total);
      await pgx.table.expectRows(total);
      await pgx.table.expectPaginationState("only");
      const all = await pgx.table.rows.allInnerTexts();
      expect(all.slice(0, 10)).toEqual(firstPage);
      expect(all.slice(10, 20)).toEqual(secondPage);
    });
  });

  test("is sorted by confidence level on the server, and the header reverses the order", async ({
    page,
    testConfig,
  }) => {
    const { smallMolecule } = drugIds(testConfig);
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(smallMolecule);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    const total = await pgx.table.total();
    expect(total, "warfarin has hundreds of annotations at every level").toBeGreaterThan(100);
    await pgx.table.expectRows(10);

    await test.step("default: strongest evidence first", async () => {
      const levels = await pgx.table.columnTexts(PGX_COLUMN.confidence);
      for (const level of levels) expect(level).toBe("Level 1A");
      await expect(pgx.confidenceHeader.locator("svg[data-icon='arrow-up']")).toBeVisible();
    });

    await test.step("clicking the header sorts descending: weakest evidence first", async () => {
      await pgx.confidenceHeader.getByText("Confidence Level").click();
      await expect(pgx.confidenceHeader.locator("svg[data-icon='arrow-down']")).toBeVisible();
      await expect(pgx.table.cell(0, PGX_COLUMN.confidence)).toHaveText("Level 4");
      await pgx.table.expectRows(10);
      await pgx.table.expectPosition(1, 10, total);
      const ranks = levelRanks(await pgx.table.columnTexts(PGX_COLUMN.confidence));
      expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    });

    await test.step("the descending order holds across the whole list", async () => {
      await pgx.table.lastPageButton.click();
      await pgx.table.expectPaginationState("last");
      await expect(pgx.table.rows.last().locator("td").nth(PGX_COLUMN.confidence)).toHaveText(
        "Level 1A"
      );
    });

    await test.step("no other column offers sorting", async () => {
      await expect(pgx.table.headers.locator("svg.sortableColumn")).toHaveCount(0);
      await pgx.table.headers.nth(PGX_COLUMN.gene).getByText("Gene").click();
      await expect(pgx.confidenceHeader.locator("svg[data-icon='arrow-down']")).toBeVisible();
    });
  });

  test("ascending order holds from the first page to the last", async ({ page, testConfig }) => {
    const { smallMolecule } = drugIds(testConfig);
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(smallMolecule);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    const total = await pgx.table.total();
    await pgx.table.expectRows(10);

    await pgx.table.pageSizeSelect.selectOption("100");
    await pgx.table.expectPosition(1, 100, total);
    await pgx.table.expectRows(100);
    const firstRanks = levelRanks(await pgx.table.columnTexts(PGX_COLUMN.confidence));
    expect(firstRanks).not.toContain(-1);
    expect(firstRanks).toEqual([...firstRanks].sort((a, b) => a - b));

    await pgx.table.lastPageButton.click();
    await pgx.table.expectPaginationState("last");
    const lastStart = Math.floor((total - 1) / 100) * 100 + 1;
    await pgx.table.expectPosition(lastStart, total, total);
    await pgx.table.expectRows(total - lastStart + 1);
    const lastRanks = levelRanks(await pgx.table.columnTexts(PGX_COLUMN.confidence));
    expect(lastRanks).not.toContain(-1);
    expect(lastRanks).toEqual([...lastRanks].sort((a, b) => a - b));
    expect(lastRanks[0]).toBeGreaterThanOrEqual(firstRanks[firstRanks.length - 1]);
    expect(lastRanks[lastRanks.length - 1], "the weakest level closes the list").toBe(
      LEVEL_ORDER.indexOf("4")
    );
  });

  test("star alleles link to ClinPGx and rows without rsID or genotype say N/A", async ({
    page,
    testConfig,
  }) => {
    const { smallMolecule } = drugIds(testConfig);
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(smallMolecule);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    const total = await pgx.table.total();
    await pgx.table.expectRows(10);
    await pgx.table.pageSizeSelect.selectOption("100");
    await pgx.table.expectPosition(1, 100, total);
    await pgx.table.expectRows(100);

    const starRows = pgx.table.rows.filter({ hasText: /CYP\w+\*\d+/ });
    await expect(starRows.first()).toBeVisible();
    const row = starRows.first();
    const allele = row.locator("td").nth(PGX_COLUMN.starAllele).getByRole("link");
    await expect(allele).toHaveText(/^CYP\w+\*\d+/);
    await expect(allele).toHaveAttribute(
      "href",
      /^https:\/\/www\.pharmgkb\.org\/haplotype\/PA\d+$/
    );
    await expect(row.locator("td").nth(PGX_COLUMN.rsId)).toHaveText("N/A");
    await expect(row.locator("td").nth(PGX_COLUMN.genotypeId)).toHaveText("N/A");
    await expect(row.locator("td").nth(PGX_COLUMN.consequence)).toHaveText("N/A");
  });

  test("search runs on the server over gene, category and phenotype", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    const total = await pgx.table.total();
    await pgx.table.expectRows(10);

    await test.step("a gene symbol leaves only that gene's rows", async () => {
      const searchRequest = page.waitForRequest((request) => {
        const body = request.postDataJSON?.() as {
          operationName?: string;
          variables?: { search?: { text?: string } };
        } | null;
        return (
          body?.operationName === "DrugPharmacogenomicsQuery" &&
          body.variables?.search?.text === "ERBB3"
        );
      });
      await pgx.table.search("ERBB3", total);
      const request = await searchRequest;
      const variables = (request.postDataJSON() as { variables: { search: { fields: string[] } } })
        .variables;
      expect(variables.search.fields).toContain("TARGET_APPROVED_SYMBOL");
      expect(variables.search.fields, "the drug itself is not a search field").not.toContain(
        "DRUG_IDS"
      );

      const matches = await pgx.table.total();
      expect(matches).toBeGreaterThan(0);
      expect(matches).toBeLessThanOrEqual(10);
      await pgx.table.expectRows(matches);
      for (const gene of await pgx.table.columnTexts(PGX_COLUMN.gene)) expect(gene).toBe("ERBB3");
    });

    await test.step("a category leaves only rows of that category, over several pages", async () => {
      await pgx.table.clearSearch(total);
      await pgx.table.search("toxicity", total);
      const matches = await pgx.table.total();
      expect(matches).toBeGreaterThan(0);
      expect(matches).toBeLessThan(total);
      const shown = await pgx.table.columnTexts(PGX_COLUMN.category);
      expect(shown).toHaveLength(Math.min(10, matches));
      const phenotypes = await pgx.table.columnTexts(PGX_COLUMN.phenotype);
      for (const [index, category] of shown.entries()) {
        expect(`${category} ${phenotypes[index]}`.toLowerCase()).toContain("toxicity");
      }
    });

    await test.step("no match", async () => {
      await pgx.table.clearSearch(total);
      await pgx.table.search("zzz-no-such-gene", total);
      await pgx.table.expectRows(0);
      await expect(pgx.table.position).toHaveText(/ of 0$/);
    });

    await pgx.table.clearSearch(total);
    await pgx.table.expectRows(10);
    await pgx.table.expectPosition(1, 10, total);
  });

  test("directionality opens a drawer with the effect and its publication", async ({
    page,
    testConfig,
  }) => {
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);

    const withAnnotation = pgx.table.rows.filter({
      has: page.getByTestId("directionality-drawer-trigger"),
    });
    const withoutAnnotation = pgx.table.rows.filter({
      hasNot: page.getByTestId("directionality-drawer-trigger"),
    });
    await expect(withoutAnnotation.first().locator("td").nth(PGX_COLUMN.directionality)).toHaveText(
      "N/A"
    );
    const row = withAnnotation.first();
    const trigger = row.getByTestId("directionality-drawer-trigger");
    await expect(trigger).toHaveText(/^\s*(1 entry|\d+ entries)\s*$/);
    const entries = Number.parseInt((await trigger.innerText()).trim(), 10);
    await expect(pgx.directionalityDrawer).toHaveCount(0);

    await trigger.click();
    const drawer = pgx.directionalityDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Directionality");
    const annotations = drawer.getByTestId("ot-table").locator("tbody tr");
    await expect(annotations).toHaveCount(entries);
    await expect(annotations.first()).toContainText(/Description:\s*\S+/);
    const publication = annotations.first().getByRole("link");
    await expect(publication).toHaveText(/^\s*\d+\s*$/);
    const pmid = (await publication.innerText()).trim();
    await expect(
      row.locator("td").nth(PGX_COLUMN.literature),
      "the annotation's publication is one of the row's"
    ).toContainText(pmid);

    await test.step("the drawer has no column picker and no export", async () => {
      await expect(drawer.getByRole("button", { name: "Columns" })).toHaveCount(0);
      await expect(drawer.getByTestId("data-downloader")).toHaveCount(0);
    });

    await closeDrawer(drawer);

    await test.step("Escape closes the drawer as well", async () => {
      await trigger.click();
      await expect(drawer).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });
  });

  test("the publication of a directionality entry links to the paper", async ({
    page,
    testConfig,
  }) => {
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);

    await pgx.directionalityButtons.first().click();
    const drawer = pgx.directionalityDrawer;
    await expect(drawer).toBeVisible();
    const publication = drawer
      .getByTestId("ot-table")
      .locator("tbody tr")
      .first()
      .getByRole("link");
    await expect(publication).toHaveText(/^\s*\d+\s*$/);
    const pmid = (await publication.innerText()).trim();
    // A bare PubMed id as href resolves against the drug page and leads to a 404.
    await expect(
      publication,
      "the publication must be an absolute link to the paper, not a path relative to the page"
    ).toHaveAttribute("href", new RegExp(`^https?://europepmc\\.org/.*${pmid}$`));
  });

  test("literature opens a drawer that asks Europe PMC for the row's publication", async ({
    page,
    testConfig,
  }) => {
    // Registered after the hook's stub, so this one answers and records the searches.
    const searches = await stubEuropePmc(page);
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);
    await expect(pgx.literatureButtons).toHaveCount(10);

    const trigger = pgx.literatureButtons.first();
    await expect(trigger, "a single publication is shown by its PubMed id").toHaveText(
      /^\s*\d+\s*$/
    );
    const pmid = (await trigger.innerText()).trim();
    await expect(pgx.publicationsDrawer).toHaveCount(0);

    await trigger.click();
    const drawer = pgx.publicationsDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Publications");
    await expect(drawer.getByText("Loading Europe PMC search results")).toHaveCount(0);
    const entries = drawer.locator("[data-testid^='literature-entry-']");
    await expect(entries, "the drawer lists the one publication of the row").toHaveCount(1);
    const entry = drawer.getByTestId(`literature-entry-${pmid}`);
    await expect(entry).toBeVisible();
    expect(searches, "Europe PMC is asked for the row's PubMed id").toContainEqual([pmid]);
    await expectExternalLink(
      entry.getByRole("link").first(),
      `https://europepmc.org/abstract/med/${pmid}`
    );
    await expect(entry.getByRole("link").first()).toHaveText(`Stubbed publication ${pmid}`);
    await expect(drawer.getByText(/^\d+ - \d+ of \d+$/)).toHaveText("1 - 1 of 1");

    await test.step("the abstract toggles", async () => {
      await entry.getByRole("button", { name: "Show abstract" }).click();
      await expect(entry.getByText("Abstract", { exact: true })).toBeVisible();
      await expect(entry).toContainText(`Abstract of ${pmid}`);
      await entry.getByRole("button", { name: "Hide abstract" }).click();
      await expect(entry.getByText("Abstract", { exact: true })).toHaveCount(0);
    });

    await closeDrawer(drawer);

    await test.step("another row opens its own publication", async () => {
      const texts = (await pgx.literatureButtons.allInnerTexts()).map((text) => text.trim());
      const otherIndex = texts.findIndex((text) => /^\d+$/.test(text) && text !== pmid);
      expect(otherIndex, "the page has a row with a different single publication").toBeGreaterThan(
        0
      );
      await pgx.literatureButtons.nth(otherIndex).click();
      await expect(drawer.getByTestId(`literature-entry-${texts[otherIndex]}`)).toBeVisible();
      await expect(entries).toHaveCount(1);
      await closeDrawer(drawer);
    });
  });

  test("a row with several publications counts them and lists them all", async ({
    page,
    testConfig,
  }) => {
    const searches = await stubEuropePmc(page);
    const { smallMolecule } = drugIds(testConfig);
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(smallMolecule);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);

    const trigger = pgx.literatureButtons.filter({ hasText: /^\s*\d+ publications\s*$/ }).first();
    await expect(trigger).toBeVisible();
    const count = Number.parseInt((await trigger.innerText()).trim(), 10);
    expect(count).toBeGreaterThan(1);

    await trigger.click();
    const drawer = pgx.publicationsDrawer;
    await expect(drawer).toBeVisible();
    const entries = drawer.locator("[data-testid^='literature-entry-']");
    await expect(entries, "ten publications per page of the drawer").toHaveCount(
      Math.min(10, count)
    );
    await expect(drawer.getByText(/^\d+ - \d+ of \d+$/)).toHaveText(
      `1 - ${Math.min(10, count)} of ${count}`
    );
    const asked = searches.filter((ids) => ids.length === count);
    expect(asked.length, "Europe PMC is asked for every publication of the row").toBeGreaterThan(0);
    for (const id of asked[0]) expect(id).toMatch(/^\d+$/);
    expect(new Set(asked[0]).size, "each publication is asked for once").toBe(count);

    await test.step("the drawer's search narrows the publications to one", async () => {
      const wanted = asked[0][asked[0].length - 1];
      await drawer.getByTestId("table-search-input").fill(`Stubbed publication ${wanted}`);
      await expect(entries).toHaveCount(1);
      await expect(drawer.getByTestId(`literature-entry-${wanted}`)).toBeVisible();
    });

    await closeDrawer(drawer);
  });

  test("the literature drawer stops loading when Europe PMC cannot be reached", async ({
    page,
    testConfig,
  }) => {
    await page.route("https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST", (route) =>
      route.abort("connectionfailed")
    );
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);

    await pgx.literatureButtons.first().click();
    const drawer = pgx.publicationsDrawer;
    await expect(drawer).toBeVisible();
    // A drawer that spins forever, with an unhandled rejection behind it, tells the user
    // nothing. Whatever it shows instead, it has to stop loading.
    await expect(
      drawer.getByText("Loading Europe PMC search results"),
      "the drawer should give up loading and say the publications could not be fetched"
    ).toHaveCount(0);
  });

  test("a gene link opens the target page", async ({ page, testConfig }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const pgx = new DrugPharmacogenomicsSection(page);
    await drugPage.goto(primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);

    const link = pgx.column(PGX_COLUMN.gene).getByRole("link").first();
    const symbol = (await link.innerText()).trim();
    const href = (await link.getAttribute("href")) ?? "";
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(symbol);

    // Finish on the page under test rather than in the middle of the target page's queries.
    await page.goBack();
    await expect(drugPage.title).toHaveText(drugFacts(primary).name);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
  });

  test("the column picker keeps rsID and hides the rest on demand", async ({
    page,
    testConfig,
  }) => {
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    await pgx.table.expectRows(10);

    const picker = await pgx.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(PHARMACOGENOMICS_COLUMNS.length);
    await expect(picker.getByRole("checkbox", { name: "rsID" })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Star Allele" }).uncheck();
    await picker.getByRole("checkbox", { name: "Literature" }).uncheck();
    await pgx.table.expectHeaders(
      HEADER_PATTERNS.filter(
        (_, index) => index !== PGX_COLUMN.starAllele && index !== PGX_COLUMN.literature
      )
    );
    await expect(pgx.literatureButtons).toHaveCount(0);

    await picker.getByRole("checkbox", { name: "Star Allele" }).check();
    await picker.getByRole("checkbox", { name: "Literature" }).check();
    await pgx.table.expectHeaders(HEADER_PATTERNS);
    await expect(pgx.literatureButtons).toHaveCount(10);
  });

  test("exports every annotation, across pages, and shows its API query", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const pgx = new DrugPharmacogenomicsSection(page);
    await new DrugPage(page).goto(primary);
    await expectSectionLoaded(page, DrugPharmacogenomicsSection.id);
    const total = await pgx.table.total();
    await pgx.table.expectRows(10);

    await test.step("JSON", async () => {
      const { filename, rows } = await pgx.table.exportJson();
      expect(filename).toBe(`${primary}-pharmacogenomics.json`);
      expect(rows).toHaveLength(total);
      for (const row of rows) {
        expect(Object.keys(row)).toHaveLength(PHARMACOGENOMICS_COLUMNS.length);
        expect(String(row.rsId)).toMatch(/^rs\d+$/);
      }
    });

    await test.step("TSV", async () => {
      const { filename, header, lines } = await pgx.table.exportTsv();
      expect(filename).toBe(`${primary}-pharmacogenomics.tsv`);
      expect(header).toHaveLength(PHARMACOGENOMICS_COLUMNS.length);
      expect(lines).toHaveLength(total);
    });

    await pgx.table.expectApiQuery("DrugPharmacogenomicsQuery", primary);
  });
});
