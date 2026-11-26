import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectExternalLink } from "../../../../POM/objects/widgets/Drug/sectionTable";
import {
  PHENOTYPE_COLUMNS,
  PhenotypesSection,
} from "../../../../POM/objects/widgets/Phenotypes/phenotypesSection";
import { OTProjectsSection } from "../../../../POM/objects/widgets/OTProjects/otProjectsSection";
import { waitForOperation } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { DiseasePage } from "../../../../POM/page/disease/disease";
import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { expectSectionLoaded, expectSections } from "../../../../utils/sections";

type Evidence = {
  aspect: string | null;
  evidenceType: string | null;
  frequency: string | null;
  qualifierNot: boolean;
  onset: { id: string; name: string }[];
  modifiers: { id: string; name: string }[];
  references: string[];
  sex: string | null;
  resource: string | null;
};
type PhenotypeRow = {
  phenotypeHPO: { id: string; name: string; description: string | null } | null;
  phenotypeEFO: { id: string; name: string } | null;
  evidence: Evidence[];
};
type PhenotypesData = { disease: { id: string; phenotypes: { count: number; rows: PhenotypeRow[] } } };

/** Marfan syndrome: 100+ phenotypes (many pages), onset and modifier terms, PubMed references. */
const MARFAN = { id: "MONDO_0007947", name: "Marfan syndrome" };
/** Huntington disease: one page of phenotypes, every flavour of phenotype link. */
const HUNTINGTON = { id: "MONDO_0007739", name: "Huntington disease" };
/** No phenotypes in the API: the section must not be on the page. */
const WITHOUT = { id: "MONDO_0005068", name: "myocardial infarction" };

const PAGE_SIZE = 10;
const POSITION = /^(\d+) - (\d+) of (\d+)$/;
const ASPECTS: Record<string, string> = {
  P: "Phenotypic abnormality",
  I: "Inheritance",
  C: "Onset and clinical course",
  M: "Clinical modifier",
  H: "Past medical history",
};

/** The table rows the app draws for a page of the API: one per (phenotype, evidence) pair. */
const flatten = (rows: PhenotypeRow[]) =>
  rows.flatMap((phenotype) => phenotype.evidence.map((evidence) => ({ phenotype, evidence })));

/** What the Phenotype column shows: the EFO term name when there is one, else the HPO name. */
const phenotypeName = (phenotype: PhenotypeRow) =>
  phenotype.phenotypeEFO?.id
    ? phenotype.phenotypeEFO.name
    : (phenotype.phenotypeHPO?.name ?? "N/A");

/** Open a disease and capture the first page of phenotypes the API returned for it. */
async function openPhenotypes(page: Page, efoId: string) {
  const response = waitForOperation<PhenotypesData>(page, "PhenotypesQuery");
  await new DiseasePage(page).goto(efoId);
  const { data, variables } = await response;
  expect(variables).toMatchObject({ efoId, index: 0, size: PAGE_SIZE });
  const phenotypes = new PhenotypesSection(page);
  await expectSectionLoaded(page, PhenotypesSection.id);
  await phenotypes.table.expectLoaded();
  return { phenotypes, api: data.disease.phenotypes };
}

/** A tooltip-bearing cell shows its value followed by a help icon glyph. */
const withoutHelpIcon = (text: string) => text.replace(/\s*\?$/, "").trim();

test.describe("Disease page: Clinical signs and symptoms", () => {
  test("shows title, description, controls and the exact columns", async ({ page }) => {
    const { phenotypes } = await openPhenotypes(page, MARFAN.id);

    await test.step("title and description", async () => {
      await expect(phenotypes.title).toHaveText("Clinical signs and symptoms");
      await expect(phenotypes.description).toHaveText(
        `Clinical signs and symptoms observed in ${MARFAN.name}. Source: EFO, MONDO, HPO.`
      );
      const links = phenotypes.description.getByRole("link");
      await expect(links).toHaveText(["EFO", "MONDO", "HPO"]);
      await expectExternalLink(links.nth(0), "https://www.ebi.ac.uk/efo/");
      await expectExternalLink(links.nth(1), "https://mondo.monarchinitiative.org/");
      await expectExternalLink(links.nth(2), "https://hpo.jax.org/app/");
    });

    await test.step("columns, in order", async () => {
      await phenotypes.table.expectHeaders(PHENOTYPE_COLUMNS);
    });

    await test.step("search, columns, export and API query controls", async () => {
      await expect(phenotypes.table.searchInput).toBeVisible();
      await expect(phenotypes.table.columnsButton).toBeVisible();
      await expect(phenotypes.table.exportButton).toBeVisible();
      await expect(phenotypes.table.apiQueryButton).toBeVisible();
      await expect(phenotypes.table.pageSizeSelect).toHaveValue(String(PAGE_SIZE));
    });
  });

  test("the rows are the evidence of the phenotypes the API returned, in the same order", async ({
    page,
  }) => {
    const { phenotypes, api } = await openPhenotypes(page, MARFAN.id);
    const expected = flatten(api.rows);
    expect(api.rows, "a full first page of phenotypes").toHaveLength(PAGE_SIZE);
    expect(expected.length, "more evidence than phenotypes").toBeGreaterThan(PAGE_SIZE);

    await expect(phenotypes.table.rows).toHaveCount(expected.length);
    await phenotypes.table.expectPosition(1, PAGE_SIZE, api.count);

    await test.step("phenotype names, in API order", async () => {
      const names = (await phenotypes.columnCells("Phenotype").allInnerTexts()).map(withoutHelpIcon);
      expect(names).toEqual(expected.map(({ phenotype }) => phenotypeName(phenotype)));
    });

    await test.step("aspect, frequency, evidence type and source", async () => {
      const aspects = (await phenotypes.columnCells("Aspect").allInnerTexts()).map(withoutHelpIcon);
      expect(aspects).toEqual(expected.map(({ evidence }) => evidence.aspect ?? "N/A"));
      const frequencies = (await phenotypes.columnCells("Frequency").allInnerTexts()).map((text) =>
        text.trim()
      );
      expect(frequencies).toEqual(expected.map(({ evidence }) => evidence.frequency || "N/A"));
      const types = (await phenotypes.columnCells("Evidence").allInnerTexts()).map(withoutHelpIcon);
      expect(types).toEqual(expected.map(({ evidence }) => evidence.evidenceType ?? "N/A"));
      const sources = (await phenotypes.columnCells("Source").allInnerTexts()).map((text) =>
        text.trim()
      );
      expect(sources).toEqual(expected.map(({ evidence }) => evidence.resource || "N/A"));
      expect(new Set(sources), "this disease has HPO annotations only").toEqual(new Set(["HPO"]));
    });

    await test.step("a phenotype with an EFO or HPO term links to that term's page", async () => {
      for (const [index, { phenotype }] of expected.entries()) {
        const cell = phenotypes.cell(index, "Phenotype");
        if (phenotype.phenotypeEFO?.id) {
          await expect(cell.getByRole("link")).toHaveAttribute(
            "href",
            `/disease/${phenotype.phenotypeEFO.id}`
          );
        } else {
          await expect(cell.getByRole("link")).toHaveCount(0);
        }
      }
    });

    await test.step("a row's modifier is a link to the ontology term", async () => {
      const withModifier = expected.findIndex(({ evidence }) => evidence.modifiers.length > 0);
      expect(withModifier, "this page has a row with a modifier").toBeGreaterThanOrEqual(0);
      const modifier = expected[withModifier].evidence.modifiers[0];
      await expectExternalLink(
        phenotypes.cell(withModifier, "Modifier").getByRole("link", { name: modifier.name }),
        `https://identifiers.org/ols/${modifier.id.replace("_", ":")}`
      );
    });
  });

  test("aspect, evidence and phenotype tooltips explain their values", async ({ page }) => {
    const { phenotypes, api } = await openPhenotypes(page, MARFAN.id);
    const expected = flatten(api.rows);
    const tooltip = page.getByRole("tooltip");

    await test.step("aspect", async () => {
      const aspect = expected[0].evidence.aspect ?? "";
      expect(Object.keys(ASPECTS)).toContain(aspect);
      await phenotypes.helpIcon(0, "Aspect").hover();
      await expect(tooltip.filter({ hasText: "Sub-ontology:" })).toHaveText(
        `Sub-ontology: ${aspect} (${ASPECTS[aspect]})`
      );
    });

    await test.step("evidence type", async () => {
      const type = expected[0].evidence.evidenceType ?? "";
      expect(["IEA", "PCS", "TAS"]).toContain(type);
      await phenotypes.helpIcon(0, "Evidence").hover();
      const meaning = {
        IEA: "Inferred from Electronic Annotations",
        PCS: "Published Clinical Study",
        TAS: "Traceable Author Statement",
      }[type as "IEA" | "PCS" | "TAS"];
      await expect(tooltip.filter({ hasText: meaning })).toBeVisible();
    });

    await test.step("phenotype description", async () => {
      const described = expected.findIndex(({ phenotype }) => phenotype.phenotypeHPO?.description);
      expect(described, "a phenotype on the first page has a description").toBeGreaterThanOrEqual(0);
      const description = expected[described].phenotype.phenotypeHPO?.description ?? "";
      await phenotypes.helpIcon(described, "Phenotype").hover();
      await expect(tooltip.filter({ hasText: "Description:" })).toHaveText(
        `Description: ${description}`
      );
    });
  });

  test("references: one reference is a link, several open a drawer listing them", async ({ page }) => {
    const { phenotypes, api } = await openPhenotypes(page, MARFAN.id);
    const expected = flatten(api.rows);

    await test.step("a single PubMed reference links to Europe PMC", async () => {
      const single = expected.findIndex(
        ({ evidence }) => evidence.references.length === 1 && evidence.references[0].startsWith("PMID:")
      );
      expect(single, "a row with one PMID").toBeGreaterThanOrEqual(0);
      const pmid = expected[single].evidence.references[0];
      await expectExternalLink(
        phenotypes.cell(single, "References").getByRole("link", { name: pmid }),
        `https://europepmc.org/search?query=EXT_ID:${pmid.split(":")[1]}`
      );
    });

    await test.step("a single OMIM reference links to the HPO disease page", async () => {
      const single = expected.findIndex(
        ({ evidence }) => evidence.references.length === 1 && evidence.references[0].startsWith("OMIM:")
      );
      expect(single, "a row with one OMIM reference").toBeGreaterThanOrEqual(0);
      const omim = expected[single].evidence.references[0];
      await expectExternalLink(
        phenotypes.cell(single, "References").getByRole("link", { name: omim }),
        `https://hpo.jax.org/app/browse/disease/${omim}`
      );
    });

    await test.step("several references open a drawer with every one of them, and it closes", async () => {
      const many = expected.findIndex(({ evidence }) => evidence.references.length > 1);
      expect(many, "a row with several references").toBeGreaterThanOrEqual(0);
      const references = expected[many].evidence.references;
      const button = phenotypes.cell(many, "References").getByTestId("table-drawer");
      await expect(button).toHaveText(`${references.length} references`);
      await expect(phenotypes.drawer).toBeHidden();
      await button.click();
      await expect(phenotypes.drawer).toBeVisible();
      await expect(phenotypes.drawer).toContainText("Records");
      await expect(phenotypes.drawer.getByRole("link")).toHaveCount(references.length);
      for (const reference of references) {
        const link = phenotypes.drawer.getByRole("link", { name: reference, exact: true });
        await expect(link).toHaveAttribute(
          "href",
          reference.toUpperCase().startsWith("PMID:")
            ? `https://europepmc.org/search?query=EXT_ID:${reference.split(":").pop()}`
            : `https://hpo.jax.org/app/browse/disease/${reference}`
        );
      }
      await phenotypes.closeDrawer();
    });
  });

  test("a phenotype with an ontology term opens that term's page", async ({ page }) => {
    const { phenotypes, api } = await openPhenotypes(page, MARFAN.id);
    const first = api.rows[0];
    const id = first.phenotypeEFO?.id ?? "";
    expect(id, "the first phenotype has an ontology term").not.toBe("");

    const diseasePage = new DiseasePage(page);
    await phenotypes.cell(0, "Phenotype").getByRole("link").click();
    await expect(page).toHaveURL(new RegExp(`/disease/${id}(#[\\w-]+)?$`));
    await expect(diseasePage.title).toHaveText(phenotypeName(first));
  });

  test("paging walks through every phenotype and disables the buttons at the ends", async ({
    page,
  }) => {
    const { phenotypes, api } = await openPhenotypes(page, MARFAN.id);
    const table = phenotypes.table;
    const total = api.count;
    expect(total, "more than ten pages").toBeGreaterThan(PAGE_SIZE * 10);
    const lastStart = Math.floor((total - 1) / PAGE_SIZE) * PAGE_SIZE + 1;

    await table.expectFirstPage();
    const firstPage = await table.rowTexts();

    await test.step("next shows the following phenotypes", async () => {
      const second = waitForOperation<PhenotypesData>(page, "PhenotypesQuery");
      await table.nextPageButton.click();
      const { data, variables } = await second;
      expect(variables).toMatchObject({ index: 1, size: PAGE_SIZE });
      await table.expectPosition(PAGE_SIZE + 1, PAGE_SIZE * 2, total);
      await expect(table.rows).toHaveCount(flatten(data.disease.phenotypes.rows).length);
      await table.expectRowsChangedFrom(firstPage);
      await expect(table.firstPageButton).toBeEnabled();
      await expect(table.previousPageButton).toBeEnabled();
    });

    await test.step("previous returns to the first page", async () => {
      await table.previousPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectRowTexts(firstPage);
      await table.expectFirstPage();
    });

    await test.step("last shows the remainder and disables next and last", async () => {
      await table.lastPageButton.click();
      await table.expectPosition(lastStart, total, total);
      await table.expectLastPage();
      expect((await table.rowTexts()).length).toBeGreaterThan(0);
    });

    await test.step("first returns to the start", async () => {
      await table.firstPageButton.click();
      await table.expectPosition(1, PAGE_SIZE, total);
      await table.expectRowTexts(firstPage);
    });
  });

  test("page size changes how many phenotypes a page holds", async ({ page }) => {
    const { phenotypes, api } = await openPhenotypes(page, MARFAN.id);
    const table = phenotypes.table;
    const sizes = await table.pageSizeSelect.locator("option").allInnerTexts();
    expect(sizes).toEqual(["10", "25", "100"]);

    const bigger = waitForOperation<PhenotypesData>(page, "PhenotypesQuery");
    await table.setPageSize(25);
    const { data, variables } = await bigger;
    expect(variables).toMatchObject({ index: 0, size: 25 });
    await table.expectPosition(1, 25, api.count);
    expect(data.disease.phenotypes.rows).toHaveLength(25);
    await expect(table.rows).toHaveCount(flatten(data.disease.phenotypes.rows).length);
  });

  test("search keeps only matching rows and shows an empty table for no match", async ({ page }) => {
    const { phenotypes } = await openPhenotypes(page, MARFAN.id);
    const table = phenotypes.table;
    const term = "arachnodactyly";

    await table.search(term);
    // the whole dataset is searched, so rows come from several server pages
    await expect.poll(async () => (await table.rowTexts()).length).toBeGreaterThan(0);
    await expect
      .poll(async () => (await table.rowTexts()).every((row) => row.toLowerCase().includes(term)))
      .toBe(true);
    const matches = (await table.rowTexts()).length;
    const position = (await table.pagePosition.innerText()).match(POSITION);
    expect(position, "the footer reports the matches").not.toBeNull();
    expect(Number(position?.[3])).toBe(matches);

    await test.step("a term nothing contains leaves no rows", async () => {
      await table.search("zzzz-no-such-phenotype");
      await expect(table.rows).toHaveCount(0);
      await expect(table.pagePosition).toHaveText(/ of 0$/);
    });

    await test.step("clearing the search brings the first page back", async () => {
      await table.clearSearch();
      await expect(table.pagePosition).toHaveText(`1 - ${PAGE_SIZE} of 117`);
      await expect(table.rows.first()).not.toBeEmpty();
    });
  });

  test("search finds the onset of a phenotype on a later page, and links the onset term", async ({
    page,
  }) => {
    const { phenotypes } = await openPhenotypes(page, MARFAN.id);
    await phenotypes.table.search("Spontaneous cerebrospinal fluid leak");
    await expect(phenotypes.table.rows).toHaveCount(3);
    for (let row = 0; row < 3; row++) {
      await expect(phenotypes.cell(row, "Phenotype")).toContainText("Spontaneous cerebrospinal fluid leak");
      await expectExternalLink(
        phenotypes.cell(row, "Onset").getByRole("link", { name: "Young adult onset" }),
        "https://identifiers.org/ols/HP:0011462"
      );
    }
  });

  test("no column is sortable: clicking a header leaves the rows as they are", async ({ page }) => {
    const { phenotypes } = await openPhenotypes(page, MARFAN.id);
    const before = await phenotypes.table.rowTexts();
    await phenotypes.table.clickHeader("Phenotype");
    await phenotypes.table.clickHeader("Frequency");
    await phenotypes.table.expectRowTexts(before);
  });

  test("the column picker hides and restores columns, but not the phenotype", async ({ page }) => {
    const { phenotypes } = await openPhenotypes(page, MARFAN.id);
    const table = phenotypes.table;

    const list = await table.openColumnPicker();
    await expect(list.getByRole("checkbox", { name: "Phenotype" })).toBeDisabled();
    await list.getByRole("checkbox", { name: "Sex" }).uncheck();
    await expect(table.headers).toHaveCount(PHENOTYPE_COLUMNS.length - 1);
    await expect(table.header("Sex")).toHaveCount(0);
    await list.getByRole("checkbox", { name: "Sex" }).check();
    await table.expectHeaders(PHENOTYPE_COLUMNS);
  });

  test("exports every phenotype row as JSON and TSV", async ({ page }) => {
    const { phenotypes, api } = await openPhenotypes(page, HUNTINGTON.id);
    const table = phenotypes.table;
    const rows = flatten(api.rows);
    expect(api.count, "all phenotypes fit on one page").toBeLessThanOrEqual(PAGE_SIZE + 5);

    const json = await table.download("Json");
    expect(json.filename).toBe(`${HUNTINGTON.id}-phenotypes.json`);
    const parsed = JSON.parse(json.text) as Record<string, string>[];
    expect(parsed.length, "one record per phenotype and evidence").toBeGreaterThanOrEqual(rows.length);
    expect(Object.keys(parsed[0])).toEqual([
      "qualifierNot",
      "phenotype",
      "aspect",
      "frequency",
      "onset",
      "modifier",
      "sex",
      "evidence",
      "source",
      "references",
    ]);
    expect(parsed.map((row) => row.phenotype)).toContain("Seizure");

    const tsv = await table.download("TSV");
    expect(tsv.filename).toBe(`${HUNTINGTON.id}-phenotypes.tsv`);
    const lines = tsv.text.trim().split("\n");
    expect(lines.length - 1).toBe(parsed.length);
    expect(lines[0].split("\t")).toEqual(Object.keys(parsed[0]));
  });

  test("the API query drawer holds the phenotypes query", async ({ page }) => {
    const { phenotypes } = await openPhenotypes(page, HUNTINGTON.id);
    await phenotypes.table.expectApiQuery("PhenotypesQuery");
  });

  test("a disease with a few phenotypes: one page, mixed phenotype links, no qualifier", async ({
    page,
  }) => {
    const { phenotypes, api } = await openPhenotypes(page, HUNTINGTON.id);
    await expectSections(page, expectedSectionsFor(HUNTINGTON.id));
    const expected = flatten(api.rows);

    await phenotypes.table.expectPosition(1, PAGE_SIZE, api.count);
    expect(api.count).toBe(14);
    await expect(phenotypes.table.rows).toHaveCount(expected.length);
    await expect(phenotypes.table.nextPageButton).toBeEnabled();

    await test.step("an inheritance term has no ontology page, so it is plain text", async () => {
      const index = expected.findIndex(({ phenotype }) => !phenotype.phenotypeEFO);
      expect(index, "a phenotype without an EFO term").toBeGreaterThanOrEqual(0);
      const cell = phenotypes.cell(index, "Phenotype");
      await expect(cell).toContainText(expected[index].phenotype.phenotypeHPO?.name ?? "");
      await expect(cell.getByRole("link")).toHaveCount(0);
      await expect(phenotypes.cell(index, "Aspect")).toContainText("I");
    });

    await test.step("a term known only to the ontology still gets a link, without a description", async () => {
      const index = expected.findIndex(({ phenotype }) => !phenotype.phenotypeHPO);
      expect(index, "a phenotype without an HPO term").toBeGreaterThanOrEqual(0);
      await expect(phenotypes.cell(index, "Phenotype").getByRole("link")).toHaveAttribute(
        "href",
        `/disease/${expected[index].phenotype.phenotypeEFO?.id}`
      );
    });

    await test.step("none of this disease's evidence is negated or has an onset", async () => {
      for (const text of await phenotypes.columnCells("Qualifier").allInnerTexts()) {
        expect(text.trim()).toBe("");
      }
      for (const text of await phenotypes.columnCells("Onset").allInnerTexts()) {
        expect(text.trim()).toBe("N/A");
      }
    });

    await test.step("the second page holds the remaining phenotypes and ends the table", async () => {
      const second = waitForOperation<PhenotypesData>(page, "PhenotypesQuery");
      await phenotypes.table.nextPageButton.click();
      const { data } = await second;
      expect(data.disease.phenotypes.rows).toHaveLength(api.count - PAGE_SIZE);
      await phenotypes.table.expectPosition(PAGE_SIZE + 1, api.count, api.count);
      await phenotypes.table.expectLastPage();
      await expect(phenotypes.table.rows).toHaveCount(flatten(data.disease.phenotypes.rows).length);
    });
  });

  test("a disease with no phenotypes does not render the section, though its chip is listed", async ({
    page,
  }) => {
    const disease = new DiseasePage(page);
    await disease.goto(WITHOUT.id);
    await expectSections(page, expectedSectionsFor(WITHOUT.id));
    await expect(disease.section(PhenotypesSection.id)).toHaveCount(0);
    await expect(disease.summaryCard(PhenotypesSection.id)).toContainText("Clinical signs and symptoms");
  });

  test("the summary chip jumps to the section", async ({ page }) => {
    const { phenotypes } = await openPhenotypes(page, MARFAN.id);
    const disease = new DiseasePage(page);
    await disease.summaryCard(PhenotypesSection.id).click();
    await expect(page).toHaveURL(/#phenotypes$/);
    await expect(phenotypes.title).toBeInViewport();
  });

  test("Open Targets Projects is partner-only: not on the public profile, not even requested", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      const body = request.postData();
      if (request.method() === "POST" && body?.includes('"query"')) requests.push(body);
    });
    const projects = new OTProjectsSection(page);
    const disease = new DiseasePage(page);
    await disease.goto(MARFAN.id);
    await expectSections(page, expectedSectionsFor(MARFAN.id));

    await expect(projects.section).toHaveCount(0);
    await expect(projects.summaryCard).toHaveCount(0);
    await expect(page.getByText("Open Targets Projects")).toHaveCount(0);
    expect(requests.length, "the page did query the API").toBeGreaterThan(0);
    expect(
      requests.filter((body) => /otarProjects|OTProjects/.test(body)),
      "no request asks for Open Targets Projects"
    ).toEqual([]);
  });
});
