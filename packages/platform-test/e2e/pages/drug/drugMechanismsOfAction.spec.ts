import { expect, test } from "../../../fixtures";
import { closeDrawer, expectExternalLink } from "../../../POM/objects/widgets/Drug/sectionTable";
import {
  MECHANISMS_OF_ACTION_COLUMNS,
  MechanismsOfActionSection,
  MOA_COLUMN,
} from "../../../POM/objects/widgets/shared/mechanismsOfActionSection";
import { DrugPage } from "../../../POM/page/drug/drug";
import { drugFacts, drugIds } from "../../../POM/page/drug/drugData";
import { expectSectionLoaded } from "../../../utils/sections";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";

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
        `${drugFacts(primary).name} biochemical interactions to produce intended pharmacological effects. Curated from scientific literature and post-marketing package inserts. Source: ChEMBL`
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
      await expect(moa.referenceLinks(0)).toHaveText(["DailyMed"]);
      await expectExternalLink(moa.referenceLinks(0), /^https?:\/\/dailymed\.nlm\.nih\.gov\/.+setid=/);
    });

    await test.step("one page: every pagination button is disabled", async () => {
      await moa.table.expectPosition(1, 1, 1);
      await moa.table.expectPaginationState("only");
      await expect(moa.table.pageSizeSelect).toHaveValue("10");
      await expect(moa.table.pageSizeSelect.getByRole("option")).toHaveText(["5", "10", "25", "100"]);
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
    await expect(moa.referenceLinks(0)).toHaveText(["PubMed", "DailyMed"]);
    await expectExternalLink(
      moa.referenceLinks(0).first(),
      /^https?:\/\/europepmc\.org\/abstract\/MED\/\d+$/
    );
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
    await moa.table.expectHeaders(["Mechanism of Action", "Human targets", "References"]);
    await expect(moa.table.row(0).locator("td")).toHaveCount(3);
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
          "references",
        ]);
        expect(row.references).toBe("DailyMed,Wikipedia,FDA");
      }
      expect(rows[3].humanTargets).toBe("ABL1,BCR");
    });

    await test.step("TSV", async () => {
      const { filename, header, lines } = await moa.table.exportTsv();
      expect(filename).toBe(`${chemblId}-mechanisms-of-action.tsv`);
      expect(header).toEqual(["mechanismOfAction", "targetName", "humanTargets", "references"]);
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

// Pinned: its first mechanism has a curation value and PubMed references on the API
const DRUG_WITH_PUBMED_MOA = "CHEMBL3353410";

test.describe("Drug Mechanisms of Action Section - Curation and references", () => {
  let moaSection: MechanismsOfActionSection;

  test.beforeEach(async ({ page }) => {
    moaSection = new MechanismsOfActionSection(page);
    await new DrugPage(page).goToDrugPage(DRUG_WITH_PUBMED_MOA);
    await moaSection.waitForLoad();
    await expect(moaSection.getTable().locator("tbody tr").first()).toBeVisible();
  });

  test("Curation column sits between Human targets and References", { tag: "@smoke" }, async () => {
    const headers = await moaSection.getColumnHeaderTexts();
    const curationIndex = headers.indexOf("Curation");

    expect(curationIndex, `headers: ${headers.join(", ")}`).toBeGreaterThan(0);
    expect(headers[curationIndex - 1]).toBe("Human targets");
    expect(headers[curationIndex + 1]).toBe("References");
  });

  test("Curation value is capitalised", async () => {
    const rowCount = await moaSection.getTableRows();
    expect(rowCount).toBeGreaterThan(0);

    for (let i = 0; i < rowCount; i++) {
      expect(await moaSection.getCuration(i)).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  test("PubMed references open the publications drawer", async () => {
    const button = await moaSection.getPublicationsButton(0);
    await expect(button).toBeVisible();

    await button.click();
    await expect(moaSection.getPublicationsDrawer()).toBeVisible();
  });
});
