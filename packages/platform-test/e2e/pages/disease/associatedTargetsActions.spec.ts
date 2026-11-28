import { readFileSync } from "node:fs";
import type { Download, Locator } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { AssociationsTable } from "../../../POM/objects/widgets/AOTF/associationsTable";
import { expectedGene } from "../../../POM/objects/widgets/AOTF/expectedAssociations";

const ENSEMBL_ID = /^ENSG\d{11}$/;

/** A protein-coding gene with no association to the primary test disease (OR4F5). */
const UNASSOCIATED_TARGET = "ENSG00000186092";

/** Column keys of the exported file, in order: name, score, data sources, prioritisation. */
const EXPORT_DATA_SOURCE_KEYS = [
  "clinicalPrecedence",
  "gwasCredibleSets",
  "geneBurden",
  "eva",
  "genomicsEngland",
  "gene2Phenotype",
  "uniprotLiterature",
  "uniprotVariants",
  "orphanet",
  "clingen",
  "cancerGeneCensus",
  "intogen",
  "evaSomatic",
  "cancerBiomarkers",
  "crisprScreen",
  "crispr",
  "reactome",
  "europepmc",
  "expressionAtlas",
  "impc",
];
const EXPORT_PRIORITISATION_KEYS = [
  "maxClinicalStage",
  "isInMembrane",
  "isSecreted",
  "hasLigand",
  "hasSmallMoleculeBinder",
  "hasPocket",
  "mouseOrthologMaxIdentityPercentage",
  "hasHighQualityChemicalProbes",
  "geneticConstraint",
  "mouseKoScore",
  "geneEssentiality",
  "hasSafetyEvent",
  "isCancerDriverGene",
  "paralogMaxIdentityPercentage",
  "tissueSpecificity",
  "tissueDistribution",
  "celltypeSpecificity",
  "celltypeDistribution",
];

async function downloadedText(download: Download): Promise<string> {
  return readFileSync(await download.path(), "utf8");
}

/** Parse a TSV export into its header and one record per row. */
function parseTsv(text: string): { header: string[]; rows: Record<string, string>[] } {
  const [headerLine, ...lines] = text.split("\n").filter((line) => line.length > 0);
  const header = headerLine.split("\t");
  const rows = lines.map((line) => {
    const cells = line.split("\t");
    expect(cells, "every row should have one cell per column").toHaveLength(header.length);
    return Object.fromEntries(header.map((key, index) => [key, cells[index]]));
  });
  return { header, rows };
}

async function clickAndDownload(aotf: AssociationsTable, button: Locator): Promise<Download> {
  const [download] = await Promise.all([aotf.page.waitForEvent("download"), button.click()]);
  return download;
}

test.describe("Disease associations: row menu", () => {
  test("clicking a target's name opens a menu for that target", async ({ page, testConfig }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const row = aotf.row(2);

    const name = await aotf.openRowMenu(row);
    await expect(aotf.rowMenu.getByRole("menuitem")).toHaveText([
      "Pin target",
      "Target interactors",
      "Navigate to evidence",
      "Navigate to profile",
      "Navigate to associations",
    ]);
    await aotf.dismissOverlay(aotf.rowMenu);

    await test.step("the kebab button and a right click open the same menu", async () => {
      await row.hover();
      await row.getByTestId("context-menu-2").click();
      await expect(aotf.rowMenu.getByRole("heading", { name, exact: true })).toBeVisible();
      await aotf.dismissOverlay(aotf.rowMenu);

      await aotf.nameText(row).click({ button: "right" });
      await expect(aotf.rowMenu.getByRole("heading", { name, exact: true })).toBeVisible();
      await aotf.dismissOverlay(aotf.rowMenu);
    });

    await expect(aotf.openPanels, "the menu alone opens no panel").toHaveCount(0);
    await expect(aotf.rows("pinning")).toHaveCount(0);
  });

  test("Navigate to profile opens the profile of that target", async ({ page, testConfig }) => {
    const diseaseId = testConfig.disease.primary;
    const gene = expectedGene(diseaseId, "ADRB1");
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId);

    await aotf.openRowMenu(aotf.rowByName("ADRB1"));
    await aotf.rowMenuItem("Navigate to profile").click();
    await expect(page).toHaveURL(new RegExp(`/target/${gene.id}$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText("ADRB1");
    await expect(page.getByRole("tab", { name: "Profile" })).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/disease/${diseaseId}/associations$`));
    await aotf.expectLoaded(25);
    await expect(aotf.rowByName("ADRB1")).toHaveCount(1);
  });

  test("Navigate to associations opens the diseases associated with that target", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const gene = expectedGene(diseaseId, "APOE");
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId);

    await aotf.openRowMenu(aotf.rowByName("APOE"));
    await aotf.rowMenuItem("Navigate to associations").click();
    await expect(page).toHaveURL(new RegExp(`/target/${gene.id}/associations$`));
    await expect(page.getByTestId("profile-page-header-text")).toHaveText("APOE");
    // The table is now the other way round: one target, a row per disease.
    await aotf.expectLoaded(25);
    await expect(aotf.headerLabel("name")).toHaveText("Disease");
    await expect(aotf.nameFilter).toHaveAttribute("placeholder", "Search disease");
    await expect(
      aotf.prioritisationViewButton,
      "prioritisation is a disease-page view"
    ).toHaveCount(0);
  });

  test("Navigate to evidence opens the evidence page of that target and this disease", async ({
    page,
    testConfig,
  }) => {
    const { primary: diseaseId, name: diseaseName } = testConfig.disease;
    const gene = expectedGene(diseaseId, "ADRB1");
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId);

    await aotf.openRowMenu(aotf.rowByName("ADRB1"));
    await aotf.rowMenuItem("Navigate to evidence").click();
    await expect(page).toHaveURL(new RegExp(`/evidence/${gene.id}/${diseaseId}$`));
    const header = page.getByTestId("profile-page-header-block");
    await expect(header).toContainText("ADRB1");
    await expect(header).toContainText(diseaseName as string);
    await expect(aotf.root).toHaveCount(0);
  });
});

test.describe("Disease associations: pinning", () => {
  test("pinning targets lists them above the table and records them in the URL", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const total = (await aotf.displayedRange()).total;
    const coreNames = await aotf.rowNames();
    await expect(aotf.bodyIndicator("core"), "no body bars without pinned rows").toHaveCount(0);

    const first = await aotf.pinRow(aotf.row(1));
    expect(first).toBe(coreNames[1]);
    await aotf.expectLoaded(1, "pinning");
    await expect(aotf.rows("pinning")).toHaveCount(1);
    await aotf.expectUrlParam("pinned", ENSEMBL_ID);
    await expect(aotf.bodyIndicator("pinning")).toHaveText("Pinned (1 of 1)");
    await expect(aotf.bodyIndicator("core")).toHaveText(`All (${total})`);
    await expect(aotf.filterChip("pinned")).toHaveText("Pinned");

    await test.step("the pinned row repeats the row of the list, which stays in place", async () => {
      expect(await aotf.rowNames(), "pinning does not remove the row from the list").toEqual(
        coreNames
      );
      const pinned = aotf.rowByName(first, "pinning");
      const original = aotf.rowByName(first, "core");
      expect(await aotf.dataColumnIds(pinned)).toEqual(await aotf.dataColumnIds(original));
      await expect(aotf.dataCell(pinned, "score")).toHaveAttribute(
        "data-score",
        (await aotf.dataCell(original, "score").getAttribute("data-score")) as string
      );
    });

    await test.step("a second pin is added to the first", async () => {
      const second = await aotf.pinRow(aotf.row(4));
      await expect(aotf.rows("pinning")).toHaveCount(2);
      expect((await aotf.rowNames("pinning")).sort()).toEqual([first, second].sort());
      await expect(aotf.bodyIndicator("pinning")).toHaveText("Pinned (2 of 2)");
      const ids = (aotf.urlParam("pinned") as string).split(",");
      expect(ids).toHaveLength(2);
      for (const id of ids) expect(id).toMatch(ENSEMBL_ID);
      expect(new Set(ids).size).toBe(2);
    });

    await test.step("a pinned row's menu unpins it", async () => {
      await aotf.openRowMenu(aotf.rowByName(first, "pinning"));
      await expect(
        aotf.rowMenu.getByRole("menuitem", { name: "Pin target", exact: true })
      ).toHaveCount(0);
      await aotf.rowMenuItem("Unpin target").click();
      await expect(aotf.rowByName(first, "pinning")).toHaveCount(0);
      await expect(aotf.rows("pinning")).toHaveCount(1);
      await expect(aotf.bodyIndicator("pinning")).toHaveText("Pinned (1 of 1)");
      await aotf.expectUrlParam("pinned", ENSEMBL_ID);
    });

    await test.step("the row in the list can unpin too, and the last unpin removes the bars", async () => {
      const remaining = (await aotf.rowNames("pinning"))[0];
      await aotf.openRowMenu(aotf.rowByName(remaining, "core"));
      await aotf.rowMenuItem("Unpin target").click();
      await expect(aotf.rows("pinning")).toHaveCount(0);
      await expect(aotf.bodyIndicator("pinning")).toHaveCount(0);
      await expect(aotf.bodyIndicator("core")).toHaveCount(0);
      await expect(aotf.filterChip("pinned")).toHaveCount(0);
      await aotf.expectUrlParam("pinned", "");
      expect(await aotf.rowNames()).toEqual(coreNames);
    });
  });

  test("pinned targets in the URL are restored on load, wherever they rank, and survive a reload", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const il6 = expectedGene(diseaseId, "IL6");
    const apoe = expectedGene(diseaseId, "APOE");
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, { pinned: `${il6.id},${apoe.id}` });

    await aotf.expectLoaded(2, "pinning");
    // Pinned rows are ordered like the list: by association score.
    await aotf.expectRowNames(["APOE", "IL6"], "pinning");
    await expect(aotf.bodyIndicator("pinning")).toHaveText("Pinned (2 of 2)");
    await expect(
      aotf.rowByName("IL6", "core"),
      "IL6 is not on the first page of the list"
    ).toHaveCount(0);
    await expect(aotf.rows()).toHaveCount(25);

    await page.reload();
    await aotf.expectLoaded(2, "pinning");
    await aotf.expectRowNames(["APOE", "IL6"], "pinning");
    await expect(aotf.filterChip("pinned")).toBeVisible();
  });

  test("the Pinned and All bars collapse their rows, and the bin unpins everything", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, { pinned: expectedGene(diseaseId, "ADRB1").id });
    await aotf.expectLoaded(1, "pinning");
    const pinnedRow = aotf.rowByName("ADRB1", "pinning");

    await aotf.bodyIndicator("pinning").click();
    await expect(pinnedRow).toBeHidden();
    await expect(aotf.rows()).toHaveCount(25);
    await aotf.bodyIndicator("pinning").click();
    await expect(pinnedRow).toBeVisible();

    await aotf.bodyIndicator("core").click();
    await expect(aotf.rows()).toHaveCount(0);
    await expect(aotf.nextPageButton, "pagination belongs to the collapsed list").toHaveCount(0);
    await expect(pinnedRow).toBeVisible();
    await aotf.bodyIndicator("core").click();
    await expect(aotf.rows()).toHaveCount(25);
    await expect(aotf.nextPageButton).toBeVisible();

    await aotf.deleteBodyButton("pinning").click();
    await expect(aotf.rows("pinning")).toHaveCount(0);
    await expect(aotf.bodyIndicator("pinning")).toHaveCount(0);
    await aotf.expectUrlParam("pinned", "");
    await expect(aotf.rows()).toHaveCount(25);
  });

  test("the Pinned chip unpins everything", async ({ page, testConfig }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, {
      pinned: `${expectedGene(diseaseId, "ADRB1").id},${expectedGene(diseaseId, "APOE").id}`,
    });
    await aotf.expectLoaded(2, "pinning");

    await aotf.removeFilterChip("pinned");
    await expect(aotf.rows("pinning")).toHaveCount(0);
    await aotf.expectUrlParam("pinned", "");
    await expect(aotf.clearAllFiltersButton).toHaveCount(0);
  });

  test("a pinned target the name search excludes is counted but not shown", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, { pinned: expectedGene(diseaseId, "ADRB1").id, q: "APOE" });

    await expect(aotf.rowByName("APOE")).toHaveCount(1);
    await expect(aotf.bodyIndicator("pinning")).toHaveText("Pinned (0 of 1)", { timeout: 45_000 });
    await expect(aotf.rows("pinning")).toHaveCount(0);
    await expect(aotf.filterChips).toHaveText(['"APOE"', "Pinned"]);
  });
});

test.describe("Disease associations: uploading a list of targets", () => {
  test("the upload dialog explains the formats and shows an example in each", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const dialog = await aotf.openUploadDialog();

    await expect(dialog.getByRole("heading", { name: "Upload list of targets" })).toBeVisible();
    await expect(dialog).toContainText("allowed file formats - .txt / .csv / .tsv / .xlsx / .json");
    await expect(dialog).toContainText("The file should contain a single target in every row.");
    await expect(dialog.getByRole("link", { name: "Read more details here." })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/web-interface/associations-on-the-fly#upload-functionality"
    );
    await expect(dialog.getByText("Add a file", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Entity validation", { exact: true })).toBeVisible();
    await expect(
      dialog.getByText("Drag and drop a file here, or click to select file")
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Upload hits" })).toHaveCount(0);

    await test.step("example format", async () => {
      const examples = [
        "ENSG00000232810",
        "interleukin 6",
        "TP53",
        "ENSG00000105329",
        "P15692",
        "CD4",
      ];
      await dialog.getByRole("button", { name: "Example format" }).click();
      const formats = dialog.getByRole("group", { name: "File Example" });
      await expect(formats.getByRole("button")).toHaveText([".txt", ".csv /.tsv /.xlsx", ".json"]);
      await expect(formats.getByRole("button", { name: ".txt" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      for (const example of examples)
        await expect(dialog.getByText(example, { exact: true })).toBeVisible();

      await formats.getByRole("button", { name: ".csv /.tsv /.xlsx" }).click();
      await expect(dialog.getByRole("columnheader", { name: "id" })).toBeVisible();
      await expect(dialog.getByRole("cell")).toHaveText(examples);

      await formats.getByRole("button", { name: ".json" }).click();
      for (const example of examples)
        await expect(dialog.getByText(`"${example}",`, { exact: true })).toBeVisible();
      await expect(dialog.getByTestId("upload-run-sample-button")).toBeVisible();
      await dialog.getByTestId("upload-copy-sample-button").hover();
      await expect(page.getByRole("tooltip", { name: "Copy to clipboard" })).toBeVisible();
    });

    await test.step("Back closes the dialog on the first step", async () => {
      await dialog.getByRole("button", { name: "Back" }).click();
      await expect(dialog).toBeHidden();
      await aotf.expectUrlParam("uploaded", "");
    });
  });

  test("running the sample validates each term and uploads the matched targets", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const total = (await aotf.displayedRange()).total;
    const dialog = await aotf.openUploadDialog();

    await dialog.getByRole("button", { name: "Example format" }).click();
    await dialog.getByTestId("upload-run-sample-button").click();

    await test.step("validation step", async () => {
      await expect(dialog.getByText("Validation mappings ( Upload count: 6)")).toBeVisible();
      const mappings = dialog.getByRole("list").getByRole("checkbox");
      await expect(mappings).toHaveCount(6);
      for (const mapping of [
        "ENSG00000232810 (1 hits) - TNF",
        "interleukin 6 (1 hits) - IL6",
        "TP53 (1 hits) - TP53",
        "ENSG00000105329 (1 hits) - TGFB1",
        "P15692 (1 hits) - VEGFA",
        "CD4 (1 hits) - CD4",
      ]) {
        await expect(dialog.getByRole("checkbox", { name: mapping })).toBeChecked();
      }
      await expect(dialog.getByText("Drag and drop a file here")).toHaveCount(0);
    });

    await dialog.getByRole("button", { name: "Upload hits" }).click();
    await expect(dialog).toBeHidden();

    await test.step("the uploaded targets are listed and the full list is folded away", async () => {
      await aotf.expectLoaded(6, "uploaded");
      expect((await aotf.rowNames("uploaded")).sort()).toEqual(
        ["CD4", "IL6", "TGFB1", "TNF", "TP53", "VEGFA"].sort()
      );
      await expect(aotf.bodyIndicator("uploaded")).toHaveText("Uploaded (6 of 6)");
      await expect(aotf.bodyIndicator("core")).toHaveText(`All (${total})`);
      await expect(aotf.rows("core")).toHaveCount(0);
      await expect(aotf.filterChip("uploaded")).toHaveText("Uploaded");
      const ids = (aotf.urlParam("uploaded") as string).split(",");
      expect(ids).toHaveLength(6);
      for (const id of ids) expect(id).toMatch(ENSEMBL_ID);
    });

    await test.step("the All bar unfolds the list under the uploaded rows", async () => {
      await aotf.bodyIndicator("core").click();
      await expect(aotf.rows("core")).toHaveCount(25);
      await expect(aotf.rows("uploaded")).toHaveCount(6);
      await aotf.expectSortedBy("score");
    });

    await test.step("the bin removes the upload", async () => {
      await aotf.deleteBodyButton("uploaded").click();
      await expect(aotf.rows("uploaded")).toHaveCount(0);
      await expect(aotf.bodyIndicator("uploaded")).toHaveCount(0);
      await expect(aotf.bodyIndicator("core")).toHaveCount(0);
      await aotf.expectUrlParam("uploaded", "");
      await expect(aotf.rows("core")).toHaveCount(25);
    });
  });

  for (const file of [
    { name: "targets.txt", mimeType: "text/plain", content: "IL6\nADRB1\nnotagene_xyz" },
    {
      name: "targets.json",
      mimeType: "application/json",
      content: JSON.stringify(["IL6", "ADRB1", "notagene_xyz"]),
    },
    { name: "targets.csv", mimeType: "text/csv", content: "id\nIL6\nADRB1\nnotagene_xyz\n" },
  ]) {
    test(`a ${file.name.split(".")[1]} file is validated term by term, and only ticked hits are uploaded`, async ({
      page,
      testConfig,
    }) => {
      const diseaseId = testConfig.disease.primary;
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(diseaseId);
      const dialog = await aotf.openUploadDialog();

      await dialog.locator("input[type='file']").setInputFiles({
        name: file.name,
        mimeType: file.mimeType,
        buffer: Buffer.from(file.content),
      });

      await expect(dialog.getByText("Validation mappings ( Upload count: 3)")).toBeVisible();
      const il6 = dialog.getByRole("checkbox", { name: "IL6 (1 hits) - IL6" });
      const adrb1 = dialog.getByRole("checkbox", { name: "ADRB1 (1 hits) - ADRB1" });
      const unknown = dialog.getByRole("checkbox", { name: "notagene_xyz (0 hits)" });
      await expect(il6).toBeChecked();
      await expect(adrb1).toBeChecked();
      await expect(unknown, "a term with no match cannot be uploaded").toBeDisabled();
      await expect(unknown).not.toBeChecked();

      await adrb1.uncheck();
      await expect(adrb1).not.toBeChecked();
      await expect(il6, "unticking one hit leaves the others").toBeChecked();

      await dialog.getByRole("button", { name: "Upload hits" }).click();
      await expect(dialog).toBeHidden();
      await aotf.expectUrlParam("uploaded", expectedGene(diseaseId, "IL6").id);
      await aotf.expectLoaded(1, "uploaded");
      await aotf.expectRowNames(["IL6"], "uploaded");
      await expect(aotf.bodyIndicator("uploaded")).toHaveText("Uploaded (1 of 1)");
    });
  }

  test("Back on the validation step returns to the file step without uploading", async ({
    page,
    testConfig,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(testConfig.disease.primary);
    const dialog = await aotf.openUploadDialog();
    await dialog
      .locator("input[type='file']")
      .setInputFiles({ name: "targets.txt", mimeType: "text/plain", buffer: Buffer.from("APOE") });
    await expect(dialog.getByRole("checkbox", { name: "APOE (1 hits) - APOE" })).toBeChecked();

    await dialog.getByRole("button", { name: "Back" }).click();
    await expect(dialog.getByText("Drag and drop a file here")).toBeVisible();
    await expect(dialog.getByText("Validation mappings")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Upload hits" })).toHaveCount(0);

    await aotf.dismissOverlay(dialog);
    await aotf.expectUrlParam("uploaded", "");
    await expect(aotf.rows("uploaded")).toHaveCount(0);
    await expect(aotf.rows()).toHaveCount(25);
  });

  test("uploaded targets in the URL are restored on load; one without an association is counted but not shown", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await page.goto(
      AssociationsTable.diseasePath(diseaseId, {
        uploaded: `${UNASSOCIATED_TARGET},${expectedGene(diseaseId, "IL6").id}`,
      })
    );
    await aotf.expectLoaded(1, "uploaded");
    await aotf.expectRowNames(["IL6"], "uploaded");
    await expect(aotf.bodyIndicator("uploaded")).toHaveText("Uploaded (1 of 2)");
    await expect(aotf.rows("core"), "the full list starts folded under an upload").toHaveCount(0);

    await test.step("the Uploaded chip removes the upload", async () => {
      await aotf.removeFilterChip("uploaded");
      await aotf.expectUrlParam("uploaded", "");
      await expect(aotf.rows("uploaded")).toHaveCount(0);
      await aotf.expectLoaded(25);
    });
  });
});

test.describe("Disease associations: export", () => {
  test("the download dialog names the export and offers its options", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId);
    const dialog = await aotf.openDownloadDialog();

    await expect(dialog.getByRole("heading", { level: 2 })).toContainText(
      `Export: OT-${diseaseId}-associated-targets data`
    );
    await expect(dialog).toContainText("will export the entire association table");
    await dialog.getByRole("heading", { level: 2 }).getByRole("button").hover();
    await expect(
      page.getByRole("tooltip", { name: "Copy URL. Data sources controls not included" })
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "JSON", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("button", { name: "TSV", exact: true })).toBeEnabled();

    await test.step("advanced options", async () => {
      const toggle = dialog.getByRole("button", { name: "Advanced export options:" });
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");

      await expect(
        dialog.getByRole("combobox", { name: "Select associations data type" })
      ).toHaveText(
        "Clinical, Genetic association, Somatic mutations, Affected pathway, Literature, RNA expression, Animal model"
      );
      await expect(dialog.getByText("Selected 7 of 7")).toBeVisible();
      await expect(
        dialog.getByRole("combobox", { name: "Select prioritisation data type" })
      ).toHaveText("precedence, tractability, doability, safety");
      await expect(dialog.getByText("Selected 4 of 4")).toBeVisible();

      const customControls = dialog.getByRole("checkbox", { name: "Include custom controls" });
      await expect(customControls, "no weight was changed").toBeDisabled();
      await expect(customControls).not.toBeChecked();
      await expect(
        dialog.getByRole("checkbox", { name: "Only pinned rows" }),
        "nothing is pinned"
      ).toBeDisabled();
      const onlyPrioritisation = dialog.getByRole("checkbox", { name: "Only prioritisation data" });
      await expect(onlyPrioritisation).toBeEnabled();
      await expect(onlyPrioritisation).not.toBeChecked();
    });

    await test.step("Only prioritisation data locks the associations select", async () => {
      await dialog.getByRole("checkbox", { name: "Only prioritisation data" }).check();
      await expect(
        dialog.getByRole("combobox", { name: "Select associations data type" })
      ).toHaveAttribute("aria-disabled", "true");
    });

    await aotf.dismissOverlay(dialog);
  });

  test("TSV and JSON downloads of the pinned rows hold those targets with every column", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const adrb1 = expectedGene(diseaseId, "ADRB1");
    const il6 = expectedGene(diseaseId, "IL6");
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, { pinned: `${adrb1.id},${il6.id}` });
    await aotf.expectLoaded(2, "pinning");
    const tableScores = Object.fromEntries(
      await Promise.all(
        ["ADRB1", "IL6"].map(async (symbol) => [
          symbol,
          await aotf
            .dataCell(aotf.rowByName(symbol, "pinning"), "score")
            .getAttribute("data-score"),
        ])
      )
    );

    const dialog = await aotf.openDownloadDialog();
    await dialog.getByRole("button", { name: "Advanced export options:" }).click();
    const onlyPinned = dialog.getByRole("checkbox", { name: "Only pinned rows" });
    await expect(onlyPinned).toBeEnabled();
    await onlyPinned.check();

    const expectedHeader = [
      "symbol",
      "globalScore",
      "isPinned",
      ...EXPORT_DATA_SOURCE_KEYS,
      ...EXPORT_PRIORITISATION_KEYS,
    ];
    const fileName = new RegExp(`^OT-${diseaseId}-associated-targets-.+-v\\d+_\\d+\\.`);

    await test.step("TSV", async () => {
      const download = await clickAndDownload(
        aotf,
        dialog.getByRole("button", { name: "TSV", exact: true })
      );
      expect(download.suggestedFilename()).toMatch(fileName);
      expect(download.suggestedFilename()).toMatch(/\.tsv$/);
      const { header, rows } = parseTsv(await downloadedText(download));
      expect(header).toEqual(expectedHeader);
      expect(rows.map((row) => row.symbol)).toEqual(["ADRB1", "IL6"]);
      for (const row of rows) {
        expect(row.isPinned).toBe("true");
        expect(Number(row.globalScore).toFixed(2), `${row.symbol} score matches the table`).toBe(
          tableScores[row.symbol]
        );
        for (const key of [...EXPORT_DATA_SOURCE_KEYS, ...EXPORT_PRIORITISATION_KEYS]) {
          expect(row[key], `${row.symbol} ${key}`).toMatch(/^(No data|-?\d+(\.\d+)?(e-?\d+)?)$/);
        }
      }
      const exported = rows[0];
      expect(Number(exported.clinicalPrecedence), "ADRB1 has clinical precedence").toBeGreaterThan(
        0
      );
      expect(exported.gwasCredibleSets, "ADRB1 has no GWAS evidence").toBe("No data");
    });

    await test.step("JSON", async () => {
      const download = await clickAndDownload(
        aotf,
        dialog.getByRole("button", { name: "JSON", exact: true })
      );
      expect(download.suggestedFilename()).toMatch(fileName);
      expect(download.suggestedFilename()).toMatch(/\.json$/);
      const records = JSON.parse(await downloadedText(download)) as Record<string, unknown>[];
      expect(records.map((record) => record.symbol)).toEqual(["ADRB1", "IL6"]);
      for (const record of records) {
        expect(Object.keys(record)).toEqual(expectedHeader);
        expect(record.isPinned).toBe(true);
        expect(typeof record.globalScore).toBe("number");
      }
      expect(typeof records[1].europepmc, "IL6 has Europe PMC evidence").toBe("number");
      expect(records[1].clinicalPrecedence).toBe("No data");
    });
  });

  test("the export follows the name search, the chosen data types and Only prioritisation data", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, { q: "ADRB" });
    const names = await aotf.rowNames();
    expect(names.length).toBeLessThan(25);

    const dialog = await aotf.openDownloadDialog();
    await dialog.getByRole("button", { name: "Advanced export options:" }).click();

    await test.step("unselecting a data type drops its columns", async () => {
      await dialog.getByRole("combobox", { name: "Select associations data type" }).click();
      await page.getByRole("option", { name: "Genetic association" }).click();
      await page.keyboard.press("Escape");
      await expect(dialog.getByText("Selected 6 of 7")).toBeVisible();

      const download = await clickAndDownload(
        aotf,
        dialog.getByRole("button", { name: "TSV", exact: true })
      );
      const { header, rows } = parseTsv(await downloadedText(download));
      expect(header).toEqual([
        "symbol",
        "globalScore",
        "clinicalPrecedence",
        ...EXPORT_DATA_SOURCE_KEYS.slice(10),
        ...EXPORT_PRIORITISATION_KEYS,
      ]);
      expect(
        rows.map((row) => row.symbol),
        "the export holds the searched rows, in table order"
      ).toEqual(names);
    });

    await test.step("Only prioritisation data drops the scores", async () => {
      await dialog.getByRole("checkbox", { name: "Only prioritisation data" }).check();
      const download = await clickAndDownload(
        aotf,
        dialog.getByRole("button", { name: "TSV", exact: true })
      );
      const { header, rows } = parseTsv(await downloadedText(download));
      expect(header).toEqual(["symbol", "globalScore", ...EXPORT_PRIORITISATION_KEYS]);
      expect(rows.map((row) => row.symbol)).toEqual(names);
    });
  });

  test("API query opens the playground with the table's query and its current variables", async ({
    page,
    testConfig,
  }) => {
    const diseaseId = testConfig.disease.primary;
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(diseaseId, { sort: "europepmc:desc", page: "1", pageSize: "10" });
    const drawer = await aotf.openApiQuery();

    await expect(drawer).toContainText("API query");
    await expect(drawer.getByRole("link", { name: "GraphQL API documentation" })).toHaveAttribute(
      "href",
      "https://platform-docs.opentargets.org/data-access/graphql-api"
    );
    await expect(drawer.getByRole("link", { name: "Community" })).toHaveAttribute(
      "href",
      "https://community.opentargets.org"
    );

    const editor = drawer.getByTestId("graphiql-container");
    await expect(editor).toBeVisible({ timeout: 45_000 });
    await expect(editor).toContainText("query DiseaseAssociationsQuery(");
    await expect(editor).toContainText("associatedTargets(");
    // The variables pane holds the state of the table.
    await expect(editor).toContainText(`"id": "${diseaseId}"`);
    await expect(editor).toContainText('"index": 1');
    await expect(editor).toContainText('"size": 10');
    await expect(editor).toContainText('"key": "europepmc"');
    await expect(editor).toContainText('"direction": "DESCENDING"');

    await drawer.getByTestId("drawer-close").click();
    await expect(drawer).toBeHidden();
    await expect(aotf.rows()).toHaveCount(10);
  });
});
