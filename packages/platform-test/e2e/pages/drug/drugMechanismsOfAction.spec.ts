import { expect, test } from "../../../fixtures";
import { closeDrawer, expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  MECHANISMS_OF_ACTION_COLUMNS,
  MechanismsOfActionSection,
  MOA_COLUMN,
} from "../../../POM/objects/widgets/shared/mechanismsOfActionSection";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { DrugPage } from "../../../POM/page/drug/drug";
import { drugFacts, drugIds } from "../../../POM/page/drug/drugData";
import { expectSectionLoaded } from "../../../utils/sections";

const TARGET_HREF = /^\/target\/ENSG\d{11}$/;

test.describe("Drug page: Mechanisms of Action", () => {
  // Every drug page mounts the Bibliography section, which asks Europe PMC for publication
  // details. That third-party service throttles and then answers without CORS headers, so
  // it is stubbed: these tests depend only on the app and its own API.
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  test("shows title, description and the mechanism with its target and reference", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const drugPage = new DrugPage(page);
    const moa = new MechanismsOfActionSection(page);
    await drugPage.goto(primary);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);

    await test.step("title and description", async () => {
      await expect(drugPage.sectionTitle(MechanismsOfActionSection.id)).toHaveText(
        "Mechanisms of Action"
      );
      await expect(moa.description).toHaveText(
        `${drugFacts(primary).name} biochemical interactions to produce intended pharmacological effects. Curated from scientific literature and post-marketing package inserts. Source: ChEMBL, Open Targets`
      );
      await expectExternalLink(
        moa.description.getByRole("link", { name: "ChEMBL" }),
        "https://www.ebi.ac.uk/chembl/"
      );
    });

    await test.step("columns", async () => {
      await moa.table.expectHeaders(MECHANISMS_OF_ACTION_COLUMNS);
    });

    await test.step("the single mechanism of trastuzumab", async () => {
      await moa.table.expectRows(1);
      await expect(moa.table.cell(0, MOA_COLUMN.mechanism)).toHaveText(
        "Receptor protein-tyrosine kinase erbB-2 inhibitor"
      );
      await expect(moa.table.cell(0, MOA_COLUMN.targetName)).toHaveText(
        "Receptor tyrosine-protein kinase erbB-2"
      );
      await expect(moa.targetLinks(0)).toHaveText(["ERBB2"]);
      await expect(moa.targetLinks(0)).toHaveAttribute("href", "/target/ENSG00000141736");
      await expect(moa.table.cell(0, MOA_COLUMN.curation)).toHaveText("Manual");
      await expect(moa.publicationsButton(0), "no PubMed references").toHaveCount(0);
      await expect(moa.referenceLinks(0)).toHaveText(["DailyMed"]);
      await expectExternalLink(
        moa.referenceLinks(0),
        /^https?:\/\/dailymed\.nlm\.nih\.gov\/.+setid=/
      );
    });

    await test.step("one page: every pagination button is disabled", async () => {
      await moa.table.expectPosition(1, 1, 1);
      await moa.table.expectPaginationState("only");
      await expect(moa.table.pageSizeSelect).toHaveValue("10");
      await expect(moa.table.pageSizeSelect.getByRole("option")).toHaveText([
        "5",
        "10",
        "25",
        "100",
      ]);
    });
  });

  test("lists several mechanisms with well-formed targets and references", async ({
    page,
    testConfig,
  }) => {
    const { withMultipleMechanisms: chemblId } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);

    await moa.table.expectRows(4);
    await moa.table.expectPosition(1, 4, 4);

    const mechanisms = await moa.table.columnTexts(MOA_COLUMN.mechanism);
    expect(new Set(mechanisms).size, "each mechanism is listed once").toBe(mechanisms.length);
    for (const mechanism of mechanisms) expect(mechanism).toMatch(/\binhibitor$/);
    for (const targetName of await moa.table.columnTexts(MOA_COLUMN.targetName)) {
      expect(targetName).not.toBe("");
    }
    expect(await moa.table.columnTexts(MOA_COLUMN.curation)).toEqual(Array(4).fill("Manual"));

    await test.step("every target link points at a target page", async () => {
      const links = moa.table.rows
        .locator(`td:nth-child(${MOA_COLUMN.targets + 1})`)
        .getByRole("link");
      await expect(links).toHaveText(["ABL1", "PDGFRB", "KIT"]);
      for (const link of await links.all()) await expect(link).toHaveAttribute("href", TARGET_HREF);
    });

    await test.step("every row has references, each an absolute link named after its source", async () => {
      for (let row = 0; row < mechanisms.length; row++) {
        const references = moa.referenceLinks(row);
        await expect(references).toHaveText(["DailyMed", "Wikipedia", "FDA"]);
        for (const reference of await references.all()) {
          await expect(reference).toHaveAttribute("href", /^https?:\/\/\S+$/);
        }
        await expect(moa.table.cell(row, MOA_COLUMN.references)).toHaveText(
          "DailyMed, Wikipedia, FDA"
        );
      }
    });
  });

  test("a mechanism with several targets lists them in a drawer", async ({ page, testConfig }) => {
    const { withMultipleMechanisms: chemblId } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(4);

    const fusionRow = moa.table.rows.filter({ hasText: "Bcr/Abl fusion protein inhibitor" });
    await expect(fusionRow).toHaveCount(1);
    const button = fusionRow.getByTestId("table-drawer");
    await expect(button).toHaveText("2 entries");
    await expect(moa.targetsDrawer).toHaveCount(0);

    await button.click();
    const drawer = moa.targetsDrawer;
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText("Records");
    await expect(drawer).toContainText("Human targets");
    await expect(drawer).toContainText("2 Records");
    const links = drawer.getByRole("listitem").getByRole("link");
    await expect(links).toHaveText(["ABL1", "BCR"]);
    await expect(links.nth(0)).toHaveAttribute("href", "/target/ENSG00000097007");
    await expect(links.nth(1)).toHaveAttribute("href", "/target/ENSG00000186716");

    await closeDrawer(drawer);
    await expect(button).toBeVisible();

    await test.step("Escape closes the drawer as well", async () => {
      await button.click();
      await expect(drawer).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    });
  });

  test("a mechanism without a human target says so", async ({ page, testConfig }) => {
    const { withNonHumanTarget: chemblId } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);

    await moa.table.expectRows(1);
    await expect(moa.table.cell(0, MOA_COLUMN.mechanism)).toHaveText(
      "Bacterial penicillin-binding protein inhibitor"
    );
    await expect(moa.table.cell(0, MOA_COLUMN.targets)).toHaveText("non-human");
    await expect(moa.targetLinks(0)).toHaveCount(0);
  });

  test("the description links the related molecules of a drug that has them", async ({
    page,
    testConfig,
  }) => {
    const { smallMolecule } = drugIds(testConfig);
    const facts = drugFacts(smallMolecule);
    const children = facts.children;
    if (!children) throw new Error(`${smallMolecule} must have recorded child molecules`);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(smallMolecule);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(1);

    await expect(moa.description).toContainText(`${facts.name}, and related molecules`);
    for (const child of children) {
      await expect(moa.description.getByRole("link", { name: child.name })).toHaveAttribute(
        "href",
        `/drug/${child.id}`
      );
    }

    await test.step("PubMed references open a publications drawer, other sources stay links", async () => {
      await expect(moa.table.cell(0, MOA_COLUMN.curation)).toHaveText("Manual");
      const button = moa.publicationsButton(0);
      await expect(button).toHaveText(/^\s*\d+\s*$/);
      const pmid = (await button.innerText()).trim();
      await expect(moa.referenceLinks(0)).toHaveText(["DailyMed"]);
      await expectExternalLink(
        moa.referenceLinks(0),
        /^https?:\/\/dailymed\.nlm\.nih\.gov\/.+setid=/
      );
      await expect(moa.publicationsDrawer).toHaveCount(0);

      await button.click();
      const drawer = moa.publicationsDrawer;
      await expect(drawer).toBeVisible();
      await expect(drawer).toContainText("Publications");
      await expect(drawer).toContainText(`Stubbed publication ${pmid}`);

      await closeDrawer(drawer);
      await expect(button).toBeVisible();
    });
  });

  test("the curation column shows Electronic for electronically curated mechanisms", async ({
    page,
    testConfig,
  }) => {
    const { sparse } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(sparse);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(5);
    expect(await moa.table.columnTexts(MOA_COLUMN.curation)).toEqual(Array(5).fill("Electronic"));
    await expect(moa.table.headers.filter({ hasText: "Curation" })).toHaveCount(1);

    await test.step("PubMed references are a drawer button and export with their ids", async () => {
      await expect(moa.publicationsButton(0)).toHaveText(/^\s*\d+ publications\s*$/);
      await expect(moa.referenceLinks(0)).toHaveCount(0);
      const { rows } = await moa.table.exportJson();
      expect(rows).toHaveLength(5);
      for (const row of rows) {
        expect(row.curation).toBe("Electronic");
        expect(row.references).toMatch(/^PubMed \(\d+(; \d+)*\)(,PMC)?$/);
      }
    });
  });

  test("search narrows the rows, a term with no match empties the table, clearing restores it", async ({
    page,
    testConfig,
  }) => {
    const { withMultipleMechanisms: chemblId } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(4);
    await expect(moa.table.searchInput).toHaveAttribute("placeholder", "Search all columns...");

    await moa.table.search("PDGFRB", 4);
    await moa.table.expectRows(1);
    await expect(moa.table.row(0)).toContainText("PDGFRB");
    await expect(moa.table.cell(0, MOA_COLUMN.mechanism)).toHaveText(
      "Platelet-derived growth factor receptor beta inhibitor"
    );
    await moa.table.expectPosition(1, 1, 1);

    await test.step("the search is case-insensitive and also covers the mechanism text", async () => {
      await moa.table.clearSearch(4);
      await moa.table.search("stem cell growth", 4);
      await moa.table.expectRows(1);
      await expect(moa.targetLinks(0)).toHaveText(["KIT"]);
    });

    await test.step("no match", async () => {
      await moa.table.clearSearch(4);
      await moa.table.search("zzz-no-such-mechanism", 4);
      await moa.table.expectRows(0);
      await expect(moa.table.position).toHaveText(/ of 0$/);
      await moa.table.expectPaginationState("only");
    });

    await moa.table.clearSearch(4);
    await moa.table.expectRows(4);
  });

  test("the column picker hides and restores columns, and keeps the mechanism column", async ({
    page,
    testConfig,
  }) => {
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(drugIds(testConfig).primary);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(1);

    const picker = await moa.table.openColumnPicker();
    await expect(picker.getByRole("checkbox")).toHaveCount(MECHANISMS_OF_ACTION_COLUMNS.length);
    for (const column of MECHANISMS_OF_ACTION_COLUMNS) {
      await expect(picker.getByRole("checkbox", { name: column })).toBeChecked();
    }
    await expect(
      picker.getByRole("checkbox", { name: "Mechanism of Action" }),
      "the identifying column cannot be hidden"
    ).toBeDisabled();

    await picker.getByRole("checkbox", { name: "Target Name" }).uncheck();
    await moa.table.expectHeaders([
      "Mechanism of Action",
      "Human targets",
      "Curation",
      "References",
    ]);
    await expect(moa.table.row(0).locator("td")).toHaveCount(4);
    await expect(moa.table.row(0)).not.toContainText("Receptor tyrosine-protein kinase erbB-2");

    await picker.getByRole("checkbox", { name: "Target Name" }).check();
    await moa.table.expectHeaders(MECHANISMS_OF_ACTION_COLUMNS);
    await expect(moa.table.cell(0, MOA_COLUMN.targetName)).toHaveText(
      "Receptor tyrosine-protein kinase erbB-2"
    );
  });

  test("changing the page size keeps every mechanism of a five-row table on one page", async ({
    page,
    testConfig,
  }) => {
    const { sparse } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(sparse);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(5);
    await moa.table.expectPosition(1, 5, 5);
    const all = await moa.table.columnTexts(MOA_COLUMN.mechanism);

    await moa.table.pageSizeSelect.selectOption("25");
    await moa.table.expectRows(5);
    await moa.table.expectPosition(1, 5, 5);
    await moa.table.expectPaginationState("only");

    await moa.table.pageSizeSelect.selectOption("5");
    await moa.table.expectRows(5);
    expect(await moa.table.columnTexts(MOA_COLUMN.mechanism)).toEqual(all);
    await moa.table.expectPaginationState("only");
  });

  test("exports every mechanism as JSON and TSV", async ({ page, testConfig }) => {
    const { withMultipleMechanisms: chemblId } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(chemblId);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(4);
    const shown = await moa.table.columnTexts(MOA_COLUMN.mechanism);

    await test.step("JSON", async () => {
      const { filename, rows } = await moa.table.exportJson();
      expect(filename).toBe(`${chemblId}-mechanisms-of-action.json`);
      expect(rows.map((row) => row.mechanismOfAction)).toEqual(shown);
      for (const row of rows) {
        expect(Object.keys(row)).toEqual([
          "mechanismOfAction",
          "targetName",
          "humanTargets",
          "curation",
          "references",
        ]);
        expect(row.curation).toBe("Manual");
        expect(row.references).toBe("DailyMed,Wikipedia,FDA");
      }
      expect(rows[3].humanTargets).toBe("ABL1,BCR");
    });

    await test.step("TSV", async () => {
      const { filename, header, lines } = await moa.table.exportTsv();
      expect(filename).toBe(`${chemblId}-mechanisms-of-action.tsv`);
      expect(header).toEqual([
        "mechanismOfAction",
        "targetName",
        "humanTargets",
        "curation",
        "references",
      ]);
      expect(lines).toHaveLength(4);
      expect(lines.map((line) => line.split("\t")[0])).toEqual(shown);
    });
  });

  test("the API query drawer shows the query and variables behind the table", async ({
    page,
    testConfig,
  }) => {
    const { primary } = drugIds(testConfig);
    const moa = new MechanismsOfActionSection(page);
    await new DrugPage(page).goto(primary);
    await expectSectionLoaded(page, MechanismsOfActionSection.id);
    await moa.table.expectRows(1);

    await moa.table.expectApiQuery("MechanismsOfActionSectionQuery", primary);
  });
});
