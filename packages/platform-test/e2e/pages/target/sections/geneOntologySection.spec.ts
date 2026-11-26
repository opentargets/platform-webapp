import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { expect, test } from "../../../../fixtures";
import { GeneOntologySection } from "../../../../POM/objects/widgets/shared/geneOntologySection";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import { EDGE_TARGETS, targetFacts } from "../../../../POM/objects/widgets/Target/targetFacts";
import { expectSections } from "../../../../utils/sections";

const GO_TERM_HREF = /^https:\/\/identifiers\.org\/GO:\d{7}$/;
const CATEGORIES = GeneOntologySection.CATEGORIES;

test.describe("Target profile: Gene Ontology section", () => {
  test("shows its title, description and source link", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const geneOntology = new GeneOntologySection(page);

    await page.goto(`/target/${targetId}`);
    await geneOntology.expectLoaded();

    await expect(geneOntology.title).toHaveText("Gene Ontology");
    await expect(geneOntology.description).toHaveText(`Annotations for ${symbol}. Source: UniProt.`);
    await expect(geneOntology.descriptionLink("UniProt")).toHaveAttribute(
      "href",
      "https://www.uniprot.org/"
    );
  });

  test("rows link the GO term and the gene product, and carry an evidence code and a source", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { uniprotId } = targetFacts(targetId);
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${targetId}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();

    await controls.expectHeaders(GeneOntologySection.COLUMNS);
    await expect(controls.rows).toHaveCount(10);
    const total = await controls.total();
    expect(total, "the primary target should have several pages of annotations").toBeGreaterThan(
      25
    );
    await controls.expectPosition(1, 10, total);

    for (let row = 0; row < 10; row++) {
      await test.step(`row ${row + 1}`, async () => {
        expect(CATEGORIES).toContain((await geneOntology.category(row).innerText()).trim());

        await expect(geneOntology.termLink(row)).toHaveText(/\S/);
        const termHref = (await geneOntology.termLink(row).getAttribute("href")) as string;
        expect(termHref).toMatch(GO_TERM_HREF);
        const goId = termHref.replace("https://identifiers.org/", "");

        const geneProduct = (await geneOntology.geneProductLink(row).innerText()).trim();
        expect(geneProduct, "the gene product should be a UniProt accession").toMatch(
          /^[A-Z][A-Z0-9]{5,9}(-\d+)?$/
        );
        expect(geneProduct.split("-")[0]).toBe(uniprotId);
        await expect(
          geneOntology.geneProductLink(row),
          "the QuickGO link should be for this gene product and this GO term"
        ).toHaveAttribute(
          "href",
          `https://www.ebi.ac.uk/QuickGO/annotations?geneProductId=${geneProduct}&goId=${goId}`
        );

        await geneOntology.evidenceCode(row);
        await expect(geneOntology.sourceCell(row)).toHaveText(/^\s*(\d+|Reactome|GO_REF|DOI)\s*$/);
      });
    }
  });

  test("sources link to Reactome and GO_REF, and a publication opens the publications drawer", async ({
    page,
    testConfig,
  }) => {
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    // The drawer asks Europe PMC, which can take close to a minute. Answer it with the
    // publication that was asked for, so the test depends only on the app and its API.
    await page.route("https://www.ebi.ac.uk/europepmc/webservices/rest/searchPOST", (route) => {
      const ids = decodeURIComponent(route.request().postData() ?? "").match(/ext_id:(\d+)/gi) ?? [];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          hitCount: ids.length,
          resultList: {
            result: ids.map((id) => ({
              id: id.replace(/ext_id:/i, ""),
              source: "MED",
              title: "A stubbed publication",
              pubYear: "2008",
              authorList: { author: [{ lastName: "Stub", initials: "A" }] },
              journalInfo: { journal: { title: "Stub Journal" } },
            })),
          },
        }),
      });
    });

    await page.goto(`/target/${testConfig.target?.primary}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();

    await test.step("Reactome sources link to the reaction", async () => {
      await controls.search("Reactome");
      await expect(controls.table.row(0)).toContainText("Reactome");
      await expect(geneOntology.sourceCell(0).getByRole("link")).toHaveText("Reactome");
      await expect(geneOntology.sourceCell(0).getByRole("link")).toHaveAttribute(
        "href",
        /^https:\/\/identifiers\.org\/reactome:R-HSA-\d+$/
      );
    });

    await test.step("GO_REF sources link to the GO reference", async () => {
      await controls.search("GO_REF");
      await expect(controls.table.row(0)).toContainText("GO_REF");
      await expect(geneOntology.sourceCell(0).getByRole("link")).toHaveText("GO_REF");
      await expect(geneOntology.sourceCell(0).getByRole("link")).toHaveAttribute(
        "href",
        /^https:\/\/identifiers\.org\/GO_REF:\d{7}$/
      );
    });

    await test.step("a PubMed source opens the drawer with that publication", async () => {
      await controls.search("PMID");
      await expect(controls.rows.first()).toContainText(/\d{5,}/);
      await expect(geneOntology.rowsWithPublication.first()).toBeVisible();
      const button = geneOntology.rowsWithPublication.first().getByRole("button");
      const pubmedId = (await button.innerText()).trim();
      expect(pubmedId).toMatch(/^\d+$/);

      await button.click();
      const drawer = geneOntology.publicationsDrawer;
      await expect(drawer).toBeVisible();
      await expect(drawer).toContainText("Publications");
      const entry = drawer.getByTestId(`literature-entry-${pubmedId}`);
      await expect(entry, "the drawer should show the publication that was clicked").toBeVisible();
      await expect(entry).toContainText("A stubbed publication");
      await expect(entry.getByRole("link").first()).toHaveAttribute(
        "href",
        new RegExp(`europepmc\\.org/.*${pubmedId}$`)
      );

      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });
  });

  test("the evidence code help explains the code and links to the GO wiki", async ({
    page,
    testConfig,
  }) => {
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();

    const code = await geneOntology.evidenceCode(0);
    await geneOntology.evidenceHelp(0).hover();
    const tooltip = geneOntology.tooltip;
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(new RegExp(`Label:\\s*.+\\(${code}\\)`));
    await expect(tooltip).toContainText(/Category:\s*\S+/);
    await expect(tooltip.getByRole("link", { name: "Gene Ontology wiki" })).toHaveAttribute(
      "href",
      new RegExp(`^http://wiki\\.geneontology\\.org/index\\.php/.*\\(${code}\\)`)
    );
  });

  test("the evidence code help works for a high-throughput direct assay (HDA) annotation", async ({
    page,
  }) => {
    // EGFR's focal adhesion annotation is inferred from a high-throughput direct assay.
    const publication = "21423176";
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${EDGE_TARGETS.membraneProtein}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();

    await controls.search(publication);
    await expect(controls.table.row(0)).toContainText(publication);
    await expect(
      geneOntology.evidenceCell(0),
      "this annotation should still carry the HDA evidence code; if not, pick another HDA row"
    ).toHaveText("HDA?");

    await geneOntology.evidenceHelp(0).hover();
    await expect(geneOntology.tooltip).toContainText(
      "Inferred from High Throughput Direct Assay (HDA)"
    );
    await expect(controls.table.root).toBeVisible();
  });

  test("rows are ordered by category across pages", async ({ page, testConfig }) => {
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    expect(total).toBeGreaterThan(100);
    expect(total, "this test assumes two pages of a hundred").toBeLessThanOrEqual(200);

    await controls.setPageSize(100);
    await expect(controls.rows).toHaveCount(100);
    await controls.expectPosition(1, 100, total);
    const firstPage = await geneOntology.categories();

    await controls.nextPageButton.click();
    await controls.expectPosition(101, total, total);
    await expect(controls.rows).toHaveCount(total - 100);
    const all = [...firstPage, ...(await geneOntology.categories())];

    expect(all).toHaveLength(total);
    expect([...new Set(all)], "the primary target should have terms of all three aspects").toEqual(
      CATEGORIES
    );
    expect(all, "rows should be grouped by category, in alphabetical order").toEqual(
      [...all].sort()
    );
  });

  test("paginates through the annotations", async ({ page, testConfig }) => {
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    expect(total).toBeGreaterThan(25);
    const lastPageStart = Math.floor((total - 1) / 10) * 10 + 1;

    await controls.expectFirstPage();
    const firstPage = await controls.rowTexts();

    await controls.nextPageButton.click();
    await controls.expectPosition(11, 20, total);
    await expect(controls.rows).toHaveCount(10);
    await expect(controls.previousPageButton).toBeEnabled();
    await expect(controls.nextPageButton).toBeEnabled();
    expect(await controls.rowTexts(), "page 2 should show different rows").not.toEqual(firstPage);

    await controls.lastPageButton.click();
    await controls.expectPosition(lastPageStart, total, total);
    await expect(controls.rows).toHaveCount(total - lastPageStart + 1);
    await controls.expectLastPage();

    await controls.previousPageButton.click();
    await controls.expectPosition(lastPageStart - 10, lastPageStart - 1, total);

    await controls.firstPageButton.click();
    await controls.expectPosition(1, 10, total);
    await controls.expectFirstPage();
    expect(await controls.rowTexts()).toEqual(firstPage);
  });

  test("searching a category keeps only its terms, and the three categories add up to the total", async ({
    page,
    testConfig,
  }) => {
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    await controls.setPageSize(100);
    await controls.expectPosition(1, Math.min(100, total), total);

    let sum = 0;
    for (const category of CATEGORIES) {
      await test.step(category, async () => {
        await controls.search(category);
        await expect
          .poll(async () => [...new Set(await geneOntology.categories())], {
            message: `only ${category} rows should remain`,
          })
          .toEqual([category]);
        const matching = await controls.total();
        expect(matching).toBeGreaterThan(0);
        expect(matching).toBeLessThan(total);
        sum += matching;
      });
    }
    expect(sum, "every annotation belongs to exactly one category").toBe(total);

    await test.step("a term nothing matches empties the table", async () => {
      await controls.search("zzqxjv-no-such-term");
      await expect(controls.rows).toHaveCount(0);
      await expect(controls.pagePosition).toHaveText(/ of 0$/);
    });

    await test.step("clearing the search restores every row", async () => {
      await controls.search("");
      await controls.expectPosition(1, Math.min(100, total), total);
    });
  });

  test("searching a GO term label finds its annotations", async ({ page, testConfig }) => {
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();

    // A term from the last page, so finding it proves the search covers every page.
    await controls.lastPageButton.click();
    await controls.expectLastPage();
    const label = (await geneOntology.termLink(0).innerText()).trim();
    const href = (await geneOntology.termLink(0).getAttribute("href")) as string;
    expect(label).not.toBe("");

    await controls.search(label);
    await expect(controls.pagePosition).toHaveText(/^1 - \d+ of \d+$/);
    await expect
      .poll(async () => controls.total(), { message: "the search should narrow the table" })
      .toBeLessThan(total);
    await expect(
      controls.rows.filter({ has: page.locator(`a[href="${href}"]`) }).first(),
      "the term that was searched for should be among the results"
    ).toBeVisible();
    await expect(geneOntology.termLink(0)).toContainText(/\S/);
  });

  test("column picker hides and restores columns, and the GO term column cannot be hidden", async ({
    page,
    testConfig,
  }) => {
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${testConfig.target?.primary}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();

    const picker = await controls.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(5);
    await expect(picker.getByRole("checkbox", { name: "GO term", exact: true })).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Evidence code" }).uncheck();
    await picker.getByRole("checkbox", { name: "Source" }).uncheck();
    await controls.expectHeaders(["Category", "GO term", "Gene product"]);

    await picker.getByRole("checkbox", { name: "Evidence code" }).check();
    await picker.getByRole("checkbox", { name: "Source" }).check();
    await controls.expectHeaders(GeneOntologySection.COLUMNS);
    await controls.closeColumnPicker(geneOntology.title);
  });

  test("exports every annotation as JSON and TSV, and shows its API query", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${targetId}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();
    const total = await controls.total();
    const firstTerm = (await geneOntology.termLink(0).innerText()).trim();

    await test.step("JSON", async () => {
      const file = await controls.download("Json");
      expect(file.filename).toBe(`${targetId}-gene-ontology-target.json`);
      const rows = JSON.parse(file.text) as Record<string, string>[];
      expect(rows, "the export should hold every annotation").toHaveLength(total);
      for (const row of rows) {
        expect(CATEGORIES).toContain(row.category);
        expect(row.goTerm).toMatch(/\S/);
        expect(row.evidenceCode).toMatch(/^[A-Z]{2,3}$/);
        expect(row.source).toMatch(/^(PMID|Reactome|GO_REF|DOI):\S+$/);
      }
      expect(rows[0].goTerm, "the export should be in the order of the table").toBe(firstTerm);
    });

    await test.step("TSV", async () => {
      const file = await controls.download("TSV");
      expect(file.filename).toBe(`${targetId}-gene-ontology-target.tsv`);
      const { header, rows } = parseTsv(file.text);
      expect(rows).toHaveLength(total);
      expect(header).toContain("category");
      expect(header).toContain("evidenceCode");
      expect(rows[0]).toContain(firstTerm);
    });

    await test.step("API query", async () => {
      await controls.expectApiQuery("TargetGeneOntologyQuery");
    });
  });

  test("the export has a field for every column of the table, including the gene product", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { uniprotId } = targetFacts(targetId);
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${targetId}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();

    const file = await controls.download("Json");
    const rows = JSON.parse(file.text) as Record<string, string>[];
    expect(Object.keys(rows[0])).toEqual([
      "category",
      "goTerm",
      "geneProduct",
      "evidenceCode",
      "source",
    ]);
    expect(rows[0].geneProduct).toContain(uniprotId as string);
  });

  test("a target annotated under a single aspect shows only that category", async ({ page }) => {
    const targetId = EDGE_TARGETS.singleAspectGeneOntology;
    const { symbol } = targetFacts(targetId);
    const geneOntology = new GeneOntologySection(page);
    const { controls } = geneOntology;

    await page.goto(`/target/${targetId}`);
    await geneOntology.expectLoaded();
    await controls.expectLoaded();

    await expect(geneOntology.description).toHaveText(`Annotations for ${symbol}. Source: UniProt.`);
    const total = await controls.total();
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(100);
    await controls.setPageSize(100);
    await expect(controls.rows).toHaveCount(total);
    expect([...new Set(await geneOntology.categories())]).toEqual(["Biological Process"]);
    await expect(geneOntology.termLink(0)).toHaveAttribute("href", GO_TERM_HREF);
  });

  test("is not rendered for a target without annotations", async ({ page }) => {
    const targetId = EDGE_TARGETS.nonCoding;
    const expected = expectedSectionsFor(targetId);
    expect(expected, "the manifest should record that this target has no GO terms").not.toContain(
      "geneontology"
    );
    const geneOntology = new GeneOntologySection(page);

    await page.goto(`/target/${targetId}`);
    await expectSections(page, expected);
    await expect(geneOntology.section).toHaveCount(0);
  });
});
