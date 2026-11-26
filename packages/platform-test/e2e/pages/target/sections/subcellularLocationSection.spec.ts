import { expectedSectionsFor } from "../../../../fixtures/expectedSections";
import { expect, test } from "../../../../fixtures";
import {
  SubcellularLocationSection,
  SWISSBIOPICS_API,
} from "../../../../POM/objects/widgets/shared/subcellularLocationSection";
import { EDGE_TARGETS, targetFacts } from "../../../../POM/objects/widgets/Target/targetFacts";
import { expectSections } from "../../../../utils/sections";

const LABELS = SubcellularLocationSection.SOURCE_LABELS;

test.describe("Target profile: Subcellular Location section", () => {
  test("shows its title, description and source links", async ({ page, testConfig }) => {
    const targetId = testConfig.target?.primary as string;
    const { symbol } = targetFacts(targetId);
    const subcellular = new SubcellularLocationSection(page);

    await page.goto(`/target/${targetId}`);
    await subcellular.expectLoaded();

    await expect(subcellular.title).toHaveText("Subcellular Location");
    await expect(subcellular.description).toHaveText(
      `Subcellular location data for ${symbol}. Source: UniProt, HPA.`
    );
    await expect(subcellular.descriptionLink("UniProt")).toHaveAttribute(
      "href",
      "https://www.uniprot.org/"
    );
    await expect(subcellular.descriptionLink("HPA")).toHaveAttribute(
      "href",
      "https://www.proteinatlas.org/"
    );
  });

  test("has a tab per source and opens on the first, with its locations and cell diagram", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const subcellular = new SubcellularLocationSection(page);

    const diagramRequest = page.waitForRequest(SWISSBIOPICS_API);
    await page.goto(`/target/${targetId}`);
    await subcellular.expectLoaded();

    await expect(subcellular.tabs).toHaveText([
      LABELS.hpa_main,
      LABELS.hpa_additional,
      LABELS.uniprot,
    ]);
    await subcellular.expectActive("hpa_main");

    await test.step("the source record link is the target's Human Protein Atlas entry", async () => {
      await expect(subcellular.panel("hpa_main")).toContainText(`Location for ${targetId}`);
      await expect(subcellular.sourceRecordLink("hpa_main")).toHaveText(targetId);
      await expect(subcellular.sourceRecordLink("hpa_main")).toHaveAttribute(
        "href",
        `https://identifiers.org/hpa:${targetId}`
      );
    });

    await test.step("locations are listed alphabetically, without duplicates", async () => {
      await expect(subcellular.locations("hpa_main").first()).toBeVisible();
      const names = await subcellular.locationNames("hpa_main");
      expect(names.length).toBeGreaterThan(0);
      for (const name of names) expect(name).toMatch(/\S/);
      expect(new Set(names).size).toBe(names.length);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    await test.step("the diagram is requested for the listed locations and drawn with highlights", async () => {
      const request = await diagramRequest;
      const codes = request.url().split("/sl/")[1].split(",");
      expect(codes.length).toBe(await subcellular.locations("hpa_main").count());
      for (const code of codes) expect(code).toMatch(/^\d{4}$/);
      await subcellular.expectDiagramDrawn("hpa_main");
      await expect
        .poll(async () => subcellular.highlightedParts("hpa_main").count(), {
          message: "at least one location should be highlighted in the drawing",
        })
        .toBeGreaterThan(0);
    });
  });

  test("switching tabs shows each source's own record link, locations and diagram", async ({
    page,
    testConfig,
  }) => {
    const targetId = testConfig.target?.primary as string;
    const { uniprotId } = targetFacts(targetId);
    const subcellular = new SubcellularLocationSection(page);

    await page.goto(`/target/${targetId}`);
    await subcellular.expectLoaded();
    await subcellular.expectActive("hpa_main");
    await subcellular.expectDiagramDrawn("hpa_main");
    const mainNames = await subcellular.locationNames("hpa_main");

    await test.step("UniProt", async () => {
      const diagramRequest = page.waitForRequest(SWISSBIOPICS_API);
      await subcellular.tab("uniprot").click();
      await subcellular.expectActive("uniprot");
      await expect(subcellular.panel("hpa_main")).toBeEmpty();
      await expect(subcellular.sourceRecordLink("uniprot")).toHaveText(uniprotId as string);
      await expect(subcellular.sourceRecordLink("uniprot")).toHaveAttribute(
        "href",
        `https://identifiers.org/uniprot:${uniprotId}`
      );
      await expect(subcellular.locations("uniprot").first()).toBeVisible();
      const names = await subcellular.locationNames("uniprot");
      expect(names, "UniProt and HPA use different location names").not.toEqual(mainNames);
      const request = await diagramRequest;
      expect(request.url().split("/sl/")[1].split(",")).toHaveLength(names.length);
      await subcellular.expectDiagramDrawn("uniprot");
    });

    await test.step("HPA additional location", async () => {
      await subcellular.tab("hpa_additional").click();
      await subcellular.expectActive("hpa_additional");
      await expect(subcellular.panel("uniprot")).toBeEmpty();
      await expect(subcellular.sourceRecordLink("hpa_additional")).toHaveAttribute(
        "href",
        `https://identifiers.org/hpa:${targetId}`
      );
      await expect(subcellular.locations("hpa_additional").first()).toBeVisible();
      await subcellular.expectDiagramDrawn("hpa_additional");
    });

    await test.step("back to HPA main location", async () => {
      await subcellular.tab("hpa_main").click();
      await subcellular.expectActive("hpa_main");
      await subcellular.expectDiagramDrawn("hpa_main");
      expect(await subcellular.locationNames("hpa_main")).toEqual(mainNames);
    });
  });

  test("hovering a location highlights its part of the cell diagram, and the other way round", async ({
    page,
    testConfig,
  }) => {
    // BRAF's main HPA location is the cytosol, SL-0091 in UniProt's location vocabulary.
    const location = "Cytosol";
    const termCode = "0091";
    const subcellular = new SubcellularLocationSection(page);

    await page.goto(`/target/${testConfig.target?.primary}`);
    await subcellular.expectLoaded();
    await subcellular.expectDiagramDrawn("hpa_main");
    const cellPart = subcellular.cellPart("hpa_main", termCode);
    await expect(subcellular.location("hpa_main", location)).toBeVisible();
    await expect(cellPart).toBeAttached();
    await expect(cellPart).toHaveClass(/subcell_present/);
    await expect(cellPart).not.toHaveClass(/hovered/);

    await test.step("from the list to the diagram", async () => {
      await subcellular.location("hpa_main", location).hover();
      await expect(cellPart).toHaveClass(/hovered/);
      await subcellular.title.hover();
      await expect(cellPart).not.toHaveClass(/hovered/);
    });

    await test.step("from the diagram", async () => {
      await cellPart.dispatchEvent("mouseover");
      await expect(cellPart).toHaveClass(/hovered/);
      await cellPart.dispatchEvent("mouseout");
      await expect(cellPart).not.toHaveClass(/hovered/);
    });
  });

  test("shows a loading message until the cell diagram arrives", async ({ page, testConfig }) => {
    const subcellular = new SubcellularLocationSection(page);
    let release = (): void => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(SWISSBIOPICS_API, async (route) => {
      await held;
      await route.continue();
    });

    await page.goto(`/target/${testConfig.target?.primary}`);
    await subcellular.expectLoaded();
    await expect(subcellular.visualization("hpa_main")).toHaveText("Loading cell diagram ...");
    await expect(subcellular.diagram("hpa_main")).toHaveCount(0);
    // The locations do not wait for the picture.
    await expect(subcellular.locations("hpa_main").first()).toBeVisible();

    release();
    await subcellular.expectDiagramDrawn("hpa_main");
  });

  test("says so when the cell diagram cannot be downloaded, and still lists the locations", async ({
    page,
    testConfig,
  }) => {
    const subcellular = new SubcellularLocationSection(page);
    await page.route(SWISSBIOPICS_API, (route) =>
      route.fulfill({ status: 503, contentType: "text/plain", body: "picture service down" })
    );

    await page.goto(`/target/${testConfig.target?.primary}`);
    await subcellular.expectLoaded();

    await expect(subcellular.visualization("hpa_main")).toHaveText(
      "Problem downloading cell diagram"
    );
    await expect(subcellular.diagram("hpa_main")).toHaveCount(0);
    await expect(subcellular.locations("hpa_main").first()).toBeVisible();
    await expect(subcellular.sourceRecordLink("hpa_main")).toBeVisible();

    // The other tabs keep working.
    await subcellular.tab("uniprot").click();
    await subcellular.expectActive("uniprot");
    await expect(subcellular.locations("uniprot").first()).toBeVisible();
  });

  test("groups isoform-specific locations under the isoform, after the general ones", async ({
    page,
  }) => {
    // EGFR: UniProt places isoform 2 in the secreted fraction, everything else unqualified.
    const targetId = EDGE_TARGETS.membraneProtein;
    const { uniprotId } = targetFacts(targetId);
    const subcellular = new SubcellularLocationSection(page);

    await page.goto(`/target/${targetId}`);
    await subcellular.expectLoaded();
    await subcellular.tab("uniprot").click();
    await subcellular.expectActive("uniprot");
    await expect(subcellular.sourceRecordLink("uniprot")).toHaveAttribute(
      "href",
      `https://identifiers.org/uniprot:${uniprotId}`
    );

    const list = subcellular.locationsList("uniprot");
    await expect(list.getByText("Isoform 2", { exact: true })).toBeVisible();
    const names = await subcellular.locationNames("uniprot");
    expect(names.length).toBeGreaterThan(2);
    expect(names.at(-1), "the isoform-specific location comes last").toBe("Secreted");
    const general = names.slice(0, -1);
    expect(general, "general locations are alphabetical").toEqual(
      [...general].sort((a, b) => a.localeCompare(b))
    );
    // The group heading sits between the general locations and the isoform's.
    await expect(list).toHaveText(new RegExp(`${escapeRegExp(general.at(-1) as string)}\\s*Isoform 2\\s*Secreted$`));
    await subcellular.expectDiagramDrawn("uniprot");
  });

  test("hovering a membrane location highlights the organelle the membrane belongs to", async ({
    page,
  }) => {
    // EGFR is on the endosome membrane (SL-0100); the drawing only has the endosome (SL-0101).
    const subcellular = new SubcellularLocationSection(page);

    await page.goto(`/target/${EDGE_TARGETS.membraneProtein}`);
    await subcellular.expectLoaded();
    await subcellular.tab("uniprot").click();
    await subcellular.expectActive("uniprot");
    await subcellular.expectDiagramDrawn("uniprot");

    const endosome = subcellular.cellPart("uniprot", "0101");
    await expect(endosome).toBeAttached();
    await expect(endosome).not.toHaveClass(/hovered/);
    await subcellular.location("uniprot", "Endosome membrane").hover();
    await expect(endosome).toHaveClass(/hovered/);
  });

  test("a target with one source has a single tab", async ({ page }) => {
    const targetId = EDGE_TARGETS.sparse;
    const { symbol, uniprotId } = targetFacts(targetId);
    const subcellular = new SubcellularLocationSection(page);

    await page.goto(`/target/${targetId}`);
    await subcellular.expectLoaded();

    await expect(subcellular.description).toContainText(`Subcellular location data for ${symbol}`);
    await expect(subcellular.tabs).toHaveText([LABELS.uniprot]);
    await subcellular.expectActive("uniprot");
    await expect(subcellular.sourceRecordLink("uniprot")).toHaveText(uniprotId as string);
    await expect(subcellular.locations("uniprot")).toHaveCount(1);
    await expect(subcellular.locations("uniprot")).toHaveText(/\S/);
    await subcellular.expectDiagramDrawn("uniprot");
  });

  test("is not rendered for a target without subcellular locations", async ({ page }) => {
    const targetId = EDGE_TARGETS.nonCoding;
    const expected = expectedSectionsFor(targetId);
    expect(expected, "the manifest should record that this target has no locations").not.toContain(
      "subcellularlocation"
    );
    const subcellular = new SubcellularLocationSection(page);

    await page.goto(`/target/${targetId}`);
    await expectSections(page, expected);
    await expect(subcellular.section).toHaveCount(0);
  });
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
