import { expect, test } from "../../../../fixtures";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import {
  type EvidenceSource,
  MolecularInteractionsSection,
} from "../../../../POM/objects/widgets/shared/molecularInteractionsSection";
import { parseTsv } from "../../../../POM/objects/widgets/Target/sectionWidgets";
import { EDGE_TARGETS, targetFacts } from "../../../../POM/objects/widgets/Target/targetFacts";
import { expectSections } from "../../../../utils/sections";

const SOURCES = MolecularInteractionsSection.SOURCES;
const TARGET_HREF = /^\/target\/ENSG\d{11}$/;
const UNIPROT_HREF = /^http:\/\/uniprot\.org\/uniprot\/[A-Z0-9-]+$/;
const DOCS = "https://platform-docs.opentargets.org/target/molecular-interactions";

test.describe("Target profile: Molecular Interactions section", () => {
  test("shows its title, description and a documentation link per source", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const interactions = new MolecularInteractionsSection(page);

    await page.goto(`/target/${targetId}`);
    await interactions.expectLoaded();

    await expect(interactions.title).toHaveText("Molecular Interactions");
    await expect(interactions.description).toHaveText(
      `Physical and functional molecular interactions with ${symbol}. Source: Open Targets, IntAct, Signor, Reactome, String`
    );
    for (const [name, href] of [
      ["Open Targets", DOCS],
      ["IntAct", `${DOCS}#intact`],
      ["Signor", `${DOCS}#signor`],
      ["Reactome", `${DOCS}#reactome`],
      ["String", `${DOCS}#string`],
    ]) {
      await expect(interactions.descriptionLink(name)).toHaveAttribute("href", href);
    }
  });

  test("has a tab per source whose count matches its table, and opens on IntAct", async ({
    page,
    testConfig,
  }) => {
    const interactions = new MolecularInteractionsSection(page);

    await page.goto(`/target/${testConfig.target?.primary}`);
    await interactions.expectLoaded();

    await expect(interactions.tabs).toHaveCount(4);
    const counts: Record<string, number> = {};
    for (const source of SOURCES) {
      counts[source] = await interactions.tabCount(source);
      expect(
        counts[source],
        `the primary target should have ${source} interactions`
      ).toBeGreaterThan(10);
      await expect(interactions.tab(source)).toBeEnabled();
    }
    await interactions.expectActive("intact");

    for (const source of SOURCES) {
      await test.step(source, async () => {
        await interactions.open(source);
        const table = interactions.interactors(source);
        await table.expectHeaders(MolecularInteractionsSection.INTERACTOR_COLUMNS[source]);
        await expect(table.rows).toHaveCount(10);
        await table.expectPosition(1, 10, counts[source]);
        await table.expectFirstPage();
      });
    }
  });

  for (const source of ["intact", "signor", "reactome"] as const) {
    test(`${source}: interactors link to their target page and UniProt entry and carry an evidence count`, async ({
      page,
      testConfig,
    }) => {
      const targetId = testConfig.target?.primary as string;
      const { symbol } = targetFacts(targetId);
      const interactions = new MolecularInteractionsSection(page);
      const table = interactions.interactors(source);

      await page.goto(`/target/${targetId}`);
      await interactions.expectLoaded();
      await interactions.tabCount(source);
      await interactions.open(source);

      await expect(interactions.interactorsTitle(source)).toHaveText(
        new RegExp(`^Interactors of\\s*${symbol}\\s*A\\s*$`)
      );
      await expect(table.rows).toHaveCount(10);

      for (let row = 0; row < 10; row++) {
        await test.step(`row ${row + 1}`, async () => {
          await expect(interactions.interactorLink(source, row)).toHaveText(/\S/);
          const href = await interactions.interactorLink(source, row).getAttribute("href");
          expect(
            TARGET_HREF.test(href as string) || UNIPROT_HREF.test(href as string),
            `the interactor should link to a target page or to UniProt, got ${href}`
          ).toBe(true);

          await expect(table.table.cell(row, 0)).toContainText("Alt ID:");
          const accession = (await interactions.altIdLink(source, row).innerText()).trim();
          expect(accession).toMatch(/^[A-Z0-9-]+$/);
          await expect(interactions.altIdLink(source, row)).toHaveAttribute(
            "href",
            `http://uniprot.org/uniprot/${accession}`
          );

          expect(await interactions.evidenceCount(source, row)).toBeGreaterThan(0);

          if (source === "intact") {
            await expect(table.table.cell(row, 1), "the score has two decimals").toHaveText(
              /^[01]\.\d{2}$/
            );
            expect(Number(await table.table.cell(row, 1).innerText())).toBeLessThanOrEqual(1);
          }
          if (source !== "reactome") {
            const roles = table.table.cell(row, source === "intact" ? 2 : 1);
            await expect(interactions.participantIcon(roles, "A")).toBeVisible();
            await expect(interactions.participantIcon(roles, "B")).toBeVisible();
          }
        });
      }
    });
  }

  test("the first interactor is selected on load and selecting another shows its evidence", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const interactions = new MolecularInteractionsSection(page);

    await page.goto(`/target/${targetId}`);
    await interactions.expectLoaded();
    await interactions.tabCount("intact");
    await interactions.expectActive("intact");
    await expect(interactions.interactors("intact").rows).toHaveCount(10);

    const names = await interactions.interactorNames("intact");
    expect(names).toHaveLength(10);
    await interactions.expectEvidenceOf(
      "intact",
      symbol,
      names[0],
      await interactions.evidenceCount("intact", 0)
    );
    await interactions
      .evidence("intact")
      .expectHeaders(MolecularInteractionsSection.EVIDENCE_COLUMNS.intact);

    // A row with another interactor, so the heading has to change.
    const other = names.findIndex((name) => name !== names[0]);
    expect(other, "the first page should list more than one interactor").toBeGreaterThan(0);

    await test.step("selecting another interactor replaces the evidence", async () => {
      const firstEvidence = (await interactions.evidence("intact").cell(0, 0).innerText()).trim();
      await interactions.selectInteractor("intact", other);
      await interactions.expectEvidenceOf(
        "intact",
        symbol,
        names[other],
        await interactions.evidenceCount("intact", other)
      );
      await expect(interactions.evidence("intact").cell(0, 0)).not.toHaveText(firstEvidence);
    });

    await test.step("clicking the selected interactor again keeps its evidence", async () => {
      await interactions.selectInteractor("intact", other);
      await interactions.expectEvidenceOf(
        "intact",
        symbol,
        names[other],
        await interactions.evidenceCount("intact", other)
      );
    });

    await test.step("going back to the first interactor restores its evidence", async () => {
      await interactions.selectInteractor("intact", 0);
      await interactions.expectEvidenceOf(
        "intact",
        symbol,
        names[0],
        await interactions.evidenceCount("intact", 0)
      );
    });
  });

  test("intact evidence rows link to the IntAct record and the publication", async ({
    page,
    testConfig,
  }) => {
    const interactions = new MolecularInteractionsSection(page);
    const evidence = interactions.evidence("intact");

    await page.goto(`/target/${testConfig.target?.primary}`);
    await interactions.expectLoaded();
    await interactions.tabCount("intact");
    await interactions.expectActive("intact");
    await expect(evidence.rows.first()).toBeVisible();
    const shown = await evidence.rows.count();
    expect(shown).toBeGreaterThan(0);

    for (let row = 0; row < shown; row++) {
      await test.step(`evidence ${row + 1}`, async () => {
        const identifier = (await evidence.cell(row, 0).innerText()).trim();
        expect(identifier).toMatch(/^EBI-\d+$/);
        await expect(evidence.cell(row, 0).getByRole("link")).toHaveAttribute(
          "href",
          `http://www.ebi.ac.uk/intact/interaction/${identifier}`
        );
        await expect(evidence.cell(row, 1), "interaction type and host organism").toHaveText(/\S/);
        await expect(interactions.participantIcon(evidence.cell(row, 2), "A")).toBeVisible();
        await expect(interactions.participantIcon(evidence.cell(row, 2), "B")).toBeVisible();
        const publication = (await evidence.cell(row, 3).innerText()).trim();
        expect(publication).toMatch(/^\d+$/);
        await expect(evidence.cell(row, 3).getByRole("link")).toHaveAttribute(
          "href",
          `http://europepmc.org/abstract/MED/${publication}`
        );
      });
    }
  });

  test("signor evidence shows the Signor identifier without a link, reactome evidence links to the reaction", async ({
    page,
    testConfig,
  }) => {
    const interactions = new MolecularInteractionsSection(page);

    await page.goto(`/target/${testConfig.target?.primary}`);
    await interactions.expectLoaded();
    await interactions.tabCount("signor");

    await test.step("signor", async () => {
      await interactions.open("signor");
      const evidence = interactions.evidence("signor");
      await evidence.expectHeaders(MolecularInteractionsSection.EVIDENCE_COLUMNS.signor);
      await expect(evidence.cell(0, 0)).toHaveText(/^SIGNOR-\d+$/);
      await expect(evidence.cell(0, 0).getByRole("link")).toHaveCount(0);
      await expect(evidence.cell(0, 1)).toHaveText(/\S/);
      await expect(evidence.cell(0, 3).getByRole("link")).toHaveAttribute(
        "href",
        /^http:\/\/europepmc\.org\/abstract\/MED\/\d+$/
      );
    });

    await test.step("reactome", async () => {
      await interactions.open("reactome");
      const evidence = interactions.evidence("reactome");
      await evidence.expectHeaders(MolecularInteractionsSection.EVIDENCE_COLUMNS.reactome);
      const identifier = (await evidence.cell(0, 0).innerText()).trim();
      expect(identifier).toMatch(/^R-HSA-\d+$/);
      await expect(evidence.cell(0, 0).getByRole("link")).toHaveAttribute(
        "href",
        `https://reactome.org/content/detail/${identifier}`
      );
      await expect(evidence.cell(0, 1)).toContainText(/Organism: \S+/);
      await expect(evidence.cell(0, 3).getByRole("link")).toHaveAttribute(
        "href",
        /^http:\/\/europepmc\.org\/abstract\/MED\/\d+$/
      );
    });
  });

  test("participant icons explain the biological role and the detection method on hover", async ({
    page,
    testConfig,
  }) => {
    const interactions = new MolecularInteractionsSection(page);

    await page.goto(`/target/${testConfig.target?.primary}`);
    await interactions.expectLoaded();
    await interactions.tabCount("intact");
    await interactions.expectActive("intact");
    await expect(interactions.evidence("intact").rows.first()).toBeVisible();

    await test.step("biological role of an interactor", async () => {
      const roles = interactions.interactors("intact").table.cell(0, 2);
      await interactions.participantIcon(roles, "B").hover();
      await expect(interactions.tooltip).toBeVisible();
      await expect(interactions.tooltip).toHaveText(/[a-z]{3,}/);
      await expect(interactions.tooltip).not.toHaveText("no data");
    });

    await test.step("detection method of an evidence entry", async () => {
      const methods = interactions.evidence("intact").cell(0, 2);
      await interactions.participantIcon(methods, "A").hover();
      const tooltip = interactions.tooltip.filter({ hasNotText: /role/ });
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toHaveText(/[a-z]{3,}/);
      await expect(tooltip).not.toHaveText("no data");
    });
  });

  test("interactors paginate on the server and each page selects its first interactor", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const interactions = new MolecularInteractionsSection(page);
    const table = interactions.interactors("reactome");

    await page.goto(`/target/${targetId}`);
    await interactions.expectLoaded();
    const total = await interactions.tabCount("reactome");
    expect(total, "this test needs at least three pages of ten").toBeGreaterThan(20);
    await interactions.open("reactome");
    await table.expectPosition(1, 10, total);
    await table.expectFirstPage();
    const firstPage = await table.rowTexts();
    expect(firstPage).toHaveLength(10);

    await test.step("next page", async () => {
      await table.nextPageButton.click();
      await table.expectPosition(11, 20, total);
      await table.expectRowsChangedFrom(firstPage);
      await expect(table.rows).toHaveCount(10);
      await expect(table.previousPageButton).toBeEnabled();
      await expect(table.firstPageButton).toBeEnabled();
      const secondPage = await table.rowTexts();
      for (const row of secondPage) {
        expect(firstPage, "page 2 should not repeat a row of page 1").not.toContain(row);
      }
      const names = await interactions.interactorNames("reactome");
      await interactions.expectEvidenceOf(
        "reactome",
        symbol,
        names[0],
        await interactions.evidenceCount("reactome", 0)
      );
    });

    await test.step("last page", async () => {
      const lastStart = Math.floor((total - 1) / 10) * 10 + 1;
      const before = await table.rowTexts();
      await table.lastPageButton.click();
      await table.expectPosition(lastStart, total, total);
      await table.expectRowsChangedFrom(before);
      await expect(table.rows).toHaveCount(total - lastStart + 1);
      await table.expectLastPage();
    });

    await test.step("first page", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(1, 10, total);
      await table.expectFirstPage();
      await table.expectRowTexts(firstPage);
    });

    await test.step("page size", async () => {
      await expect(table.pageSizeSelect.getByRole("option")).toHaveText(["10", "25", "100"]);
      await table.setPageSize(25);
      await table.expectPosition(1, 25, total);
      await expect(table.rows).toHaveCount(25);
      await table.setPageSize(100);
      await table.expectPosition(1, total, total);
      await expect(table.rows).toHaveCount(total);
      await table.expectFirstPage(true);
    });
  });

  test("searching the interactors finds one from another page and a term nothing matches empties the table", async ({
    page,
    testConfig,
  }) => {
    const interactions = new MolecularInteractionsSection(page);
    const table = interactions.interactors("signor");

    await page.goto(`/target/${testConfig.target?.primary}`);
    await interactions.expectLoaded();
    const total = await interactions.tabCount("signor");
    expect(total).toBeGreaterThan(10);
    await interactions.open("signor");

    const firstPage = await table.rowTexts();
    await table.nextPageButton.click();
    await table.expectPosition(11, Math.min(20, total), total);
    await table.expectRowsChangedFrom(firstPage);
    const name = (await interactions.interactorLink("signor", 0).innerText()).trim();
    const accession = (await interactions.altIdLink("signor", 0).innerText()).trim();
    expect(name).not.toBe("");

    await test.step("by symbol", async () => {
      await table.search(name);
      await expect(table.pagePosition).toHaveText(/^1 - \d+ of \d+$/);
      await expect
        .poll(async () => table.total(), { message: "the search should narrow the table" })
        .toBeLessThan(total);
      await expect
        .poll(async () => interactions.interactorNames("signor"), {
          message: "the interactor that was searched for should be among the results",
        })
        .toContain(name);
    });

    await test.step("a term nothing matches", async () => {
      await table.search("zzqxjv-no-such-interactor");
      await expect(table.rows).toHaveCount(0);
      await expect(table.pagePosition).toHaveText(/ of 0$/);
    });

    await test.step("by UniProt accession", async () => {
      await table.search(accession);
      await expect(table.rows.first()).toBeVisible();
      await expect(table.rows.filter({ hasText: accession }).first()).toBeVisible();
      expect(await table.total()).toBeLessThan(total);
    });

    await test.step("clearing the search restores every interactor", async () => {
      await table.search("");
      await table.expectPosition(1, 10, total);
      await table.expectRowTexts(firstPage);
    });
  });

  test("the evidence table paginates, changes page size and searches", async ({
    page,
    testConfig,
  }) => {
    const interactions = new MolecularInteractionsSection(page);
    const evidence = interactions.evidence("intact");

    await page.goto(`/target/${testConfig.target?.primary}`);
    await interactions.expectLoaded();
    await interactions.tabCount("intact");
    await interactions.expectActive("intact");
    const count = await interactions.evidenceCount("intact", 0);
    expect(
      count,
      "the top IntAct interactor should have more than two pages of evidence"
    ).toBeGreaterThan(20);
    await expect(evidence.pagePosition).toHaveText(`1–10 of ${count}`);
    await expect(evidence.firstPageButton).toBeDisabled();
    await expect(evidence.previousPageButton).toBeDisabled();
    const firstIdentifier = (await evidence.cell(0, 0).innerText()).trim();

    await test.step("next and previous", async () => {
      await evidence.nextPageButton.click();
      await expect(evidence.pagePosition).toHaveText(`11–20 of ${count}`);
      await expect(evidence.rows).toHaveCount(10);
      await expect(evidence.cell(0, 0)).not.toHaveText(firstIdentifier);
      await expect(evidence.previousPageButton).toBeEnabled();
      await evidence.previousPageButton.click();
      await expect(evidence.pagePosition).toHaveText(`1–10 of ${count}`);
      await expect(evidence.cell(0, 0)).toHaveText(firstIdentifier);
    });

    await test.step("last and first", async () => {
      const lastStart = Math.floor((count - 1) / 10) * 10 + 1;
      await evidence.lastPageButton.click();
      await expect(evidence.pagePosition).toHaveText(`${lastStart}–${count} of ${count}`);
      await expect(evidence.rows).toHaveCount(count - lastStart + 1);
      await expect(evidence.nextPageButton).toBeDisabled();
      await expect(evidence.lastPageButton).toBeDisabled();
      await evidence.firstPageButton.click();
      await expect(evidence.pagePosition).toHaveText(`1–10 of ${count}`);
    });

    await test.step("page size", async () => {
      await expect(evidence.pageSizeSelect.getByRole("option")).toHaveText(["10", "25", "100"]);
      await evidence.pageSizeSelect.selectOption("25");
      await expect(evidence.pagePosition).toHaveText(`1–${Math.min(25, count)} of ${count}`);
      await expect(evidence.rows).toHaveCount(Math.min(25, count));
      await evidence.pageSizeSelect.selectOption("10");
      await expect(evidence.rows).toHaveCount(10);
    });

    await test.step("search", async () => {
      await evidence.nextPageButton.click();
      await expect(evidence.pagePosition).toHaveText(`11–20 of ${count}`);
      const identifier = (await evidence.cell(0, 0).innerText()).trim();
      expect(identifier).toMatch(/^EBI-\d+$/);

      await evidence.search(identifier);
      await expect(evidence.rows).toHaveCount(1);
      await expect(evidence.cell(0, 0)).toHaveText(identifier);

      await evidence.search("zzqxjv-no-such-evidence");
      await expect(evidence.rows).toHaveCount(0);

      await evidence.search("");
      await expect(evidence.pagePosition).toHaveText(`1–10 of ${count}`);
      await expect(evidence.rows).toHaveCount(10);
    });
  });

  test("string: rows link to the interactor and show an overall score and a heatmap of evidence scores", async ({
    page,
    testConfig,
  }) => {
    const interactions = new MolecularInteractionsSection(page);
    const table = interactions.interactors("string");

    await page.goto(`/target/${testConfig.target?.primary}`);
    await interactions.expectLoaded();
    const total = await interactions.tabCount("string");
    await interactions.open("string");
    await expect(table.rows).toHaveCount(10);

    let previousScore = 1;
    for (let row = 0; row < 10; row++) {
      await test.step(`row ${row + 1}`, async () => {
        await expect(interactions.interactorLink("string", row)).toHaveText(/\S/);
        const href = await interactions.interactorLink("string", row).getAttribute("href");
        expect(
          TARGET_HREF.test(href as string) || UNIPROT_HREF.test(href as string),
          `the interactor should link to a target page or to UniProt, got ${href}`
        ).toBe(true);

        await expect(table.table.cell(row, 1), "the overall score has three decimals").toHaveText(
          /^[01]\.\d{3}$/
        );
        const score = Number(await table.table.cell(row, 1).innerText());
        expect(score, "String interactions are listed from the highest score").toBeLessThanOrEqual(
          previousScore
        );
        previousScore = score;

        await expect(
          interactions.stringScoreCells(row),
          "one square per evidence channel"
        ).toHaveCount(8);
        const titles = await interactions
          .stringScoreCells(row)
          .evaluateAll((cells) => cells.map((cell) => cell.getAttribute("title") ?? ""));
        for (const title of titles) expect(title).toMatch(/^(No data|[01](\.\d+)?)$/);
        expect(
          titles.filter((title) => title !== "No data").length,
          "an interaction has a score in at least one channel"
        ).toBeGreaterThan(0);
      });
    }

    await test.step("legend", async () => {
      await expect(interactions.content("string")).toContainText("No data");
      await expect(interactions.stringLegendLink).toHaveAttribute(
        "href",
        "https://string-db.org/cgi/info"
      );
    });

    await test.step("pagination", async () => {
      const firstPage = await table.rowTexts();
      await table.nextPageButton.click();
      await table.expectPosition(11, 20, total);
      await table.expectRowsChangedFrom(firstPage);
      await expect(table.rows).toHaveCount(10);
      await expect(table.previousPageButton).toBeEnabled();
      await table.setPageSize(25);
      await table.expectPosition(1, 25, total);
      await expect(table.rows).toHaveCount(25);
    });
  });

  test("exports every interactor and the evidence of the selected one, and shows the API query", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const source: EvidenceSource = "signor";
    const interactions = new MolecularInteractionsSection(page);
    const table = interactions.interactors(source);

    await page.goto(`/target/${targetId}`);
    await interactions.expectLoaded();
    const total = await interactions.tabCount(source);
    await interactions.open(source);
    const names = await interactions.interactorNames(source);
    const evidenceCount = await interactions.evidenceCount(source, 0);
    await interactions.expectEvidenceOf(source, symbol, names[0], evidenceCount);

    await test.step("interactors as JSON", async () => {
      const file = await table.download("Json");
      expect(file.filename).toBe(`${symbol}-molecular-interactions-interactors.json`);
      const rows = JSON.parse(file.text) as Record<string, string | number>[];
      expect(rows, "the export should hold every interactor, not just the page shown").toHaveLength(
        total
      );
      expect(Object.keys(rows[0])).toEqual([
        "interactorBAltId",
        "biologicalRole",
        "interactionEvidenceEntries",
      ]);
      expect(rows.slice(0, 10).map((row) => row.interactorBAltId)).toEqual(names);
      expect(rows[0].interactionEvidenceEntries).toBe(evidenceCount);
      for (const row of rows) expect(row.biologicalRole).toMatch(/^A: .+, B: .+$/);
    });

    await test.step("interactors as TSV", async () => {
      const file = await table.download("TSV");
      expect(file.filename).toBe(`${symbol}-molecular-interactions-interactors.tsv`);
      const { header, rows } = parseTsv(file.text);
      expect(header).toEqual(["interactorBAltId", "biologicalRole", "interactionEvidenceEntries"]);
      expect(rows).toHaveLength(total);
      expect(rows[0][0]).toBe(names[0]);
    });

    await test.step("evidence of the selected interactor as JSON", async () => {
      const file = await interactions.evidence(source).download("Json");
      expect(file.filename).toBe(`${symbol}-molecular-interactions-evidence.json`);
      const rows = JSON.parse(file.text) as Record<string, unknown>[];
      expect(rows).toHaveLength(evidenceCount);
      expect(Object.keys(rows[0])).toEqual([
        "interactionHostOrganism",
        "detectionMethodA",
        "detectionMethodShortName",
        "detectionMethodB",
      ]);
      for (const row of rows) expect(row.interactionHostOrganism).toMatch(/\S/);
    });

    await test.step("API query", async () => {
      await table.expectApiQuery("TargetInteractionsQuery");
    });
  });

  test("an interactor's name opens that target's page, and Back returns to the interactions", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const interactions = new MolecularInteractionsSection(page);

    await page.goto(`/target/${targetId}`);
    await interactions.expectLoaded();
    await interactions.tabCount("signor");
    await interactions.open("signor");

    // Signor lists each interactor once, so the first row is another target.
    const link = interactions.interactorLink("signor", 0);
    const name = (await link.innerText()).trim();
    const href = (await link.getAttribute("href")) as string;
    expect(href).toMatch(TARGET_HREF);
    expect(href).not.toBe(`/target/${targetId}`);

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(name);

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/target/${targetId}`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText(symbol);
    await interactions.expectLoaded();
    await interactions.tabCount("intact");
    await interactions.expectActive("intact");
  });

  test("sources without interactions are disabled and the first source with data is opened", async ({
    page,
  }) => {
    const targetId = EDGE_TARGETS.sparse;
    const { symbol } = targetFacts(targetId);
    const interactions = new MolecularInteractionsSection(page);
    const table = interactions.interactors("string");

    await page.goto(`/target/${targetId}`);
    await interactions.expectLoaded();

    await expect(interactions.description).toContainText(
      `Physical and functional molecular interactions with ${symbol}`
    );
    for (const source of ["intact", "signor", "reactome"] as const) {
      expect(await interactions.tabCount(source), `${source} should have no interactions`).toBe(0);
      await expect(interactions.tab(source)).toBeDisabled();
      await expect(interactions.tab(source)).toHaveAttribute("aria-selected", "false");
    }
    const total = await interactions.tabCount("string");
    expect(total).toBeGreaterThan(0);
    await expect(interactions.tab("string")).toBeEnabled();
    await interactions.expectActive("string");
    await table.expectHeaders(MolecularInteractionsSection.INTERACTOR_COLUMNS.string);
    await table.expectPosition(1, Math.min(10, total), total);

    await test.step("string export holds every interaction", async () => {
      const file = await table.download("Json");
      expect(file.filename).toBe(`${symbol}-molecular-interactions-string.json`);
      const rows = JSON.parse(file.text) as Record<string, string>[];
      expect(rows).toHaveLength(total);
      const channels = new Set(rows.flatMap((row) => Object.keys(row)));
      expect(
        [...channels].filter((key) => ["experiments", "databases", "textMining"].includes(key)),
        "the evidence channels with scores should be exported under their column names"
      ).not.toHaveLength(0);
    });

    await test.step("API query", async () => {
      await table.expectApiQuery("TargetInteractionsStringQuery");
    });
  });

  test("the string export names the interactor of every row", async ({ page }) => {
    const targetId = EDGE_TARGETS.sparse;
    const interactions = new MolecularInteractionsSection(page);
    const table = interactions.interactors("string");

    await page.goto(`/target/${targetId}`);
    await interactions.expectLoaded();
    await interactions.tabCount("string");
    await interactions.expectActive("string");
    await expect(table.rows.first()).toBeVisible();
    const names = await interactions.interactorNames("string");
    const scores = await table.table.columnTexts(1);

    const file = await table.download("Json");
    const rows = JSON.parse(file.text) as Record<string, string>[];
    const firstRow = Object.values(rows[0]);
    expect(firstRow, "the overall score of the first interaction should be exported").toContain(
      scores[0]
    );
    expect(firstRow, "the name of the first interactor should be exported").toContain(names[0]);
  });

  test("is not rendered for a target without interactions", async ({ page }) => {
    const targetId = EDGE_TARGETS.nonCoding;
    const expected = expectedSectionsFor(targetId);
    expect(
      expected,
      "the manifest should record that this target has no interactions"
    ).not.toContain("interactions");
    const interactions = new MolecularInteractionsSection(page);

    await page.goto(`/target/${targetId}`);
    await expectSections(page, expected);
    await expect(interactions.section).toHaveCount(0);
  });
});
