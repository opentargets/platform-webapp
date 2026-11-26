import type { Page } from "@playwright/test";
import { expect, test } from "../../../../fixtures";
import { expectExternalLink } from "../../../../POM/objects/widgets/Drug/sectionTable";
import { OntologySection } from "../../../../POM/objects/widgets/Ontology/ontologySection";
import { waitForOperation } from "../../../../POM/objects/widgets/shared/sectionDataControls";
import { DiseasePage } from "../../../../POM/page/disease/disease";
import { expectSectionLoaded } from "../../../../utils/sections";

type OntologyData = {
  disease: {
    id: string;
    name: string;
    ancestors: string[];
    parents: { id: string }[];
    children: { id: string; name: string }[];
  };
};
type AncestorsData = { diseases: { rows: { id: string; name: string }[] } };

const TERM_ID = /^[A-Za-z]+_\d+$/;

/** Myocardial infarction: a mid-level disease with four descendants and three ancestors. */
const MI = {
  id: "MONDO_0005068",
  name: "myocardial infarction",
  descendants: {
    MONDO_0004781: "acute myocardial infarction",
    MONDO_0006652: "anterolateral myocardial infarction",
    MONDO_0006803: "inferior myocardial infarction",
    EFO_0008584: "Subsequent ST elevation (STEMI) and non-ST elevation (NSTEMI) myocardial infarction",
  } as Record<string, string>,
  ancestors: {
    MONDO_0024643: "myocardial disorder",
    MONDO_0005267: "heart disorder",
    MONDO_0004995: "cardiovascular disorder",
  } as Record<string, string>,
};
/** A leaf: no descendants, a long chain of ancestors. */
const LEAF = { id: "MONDO_0016621", name: "juvenile Huntington disease", parent: "MONDO_0007739" };
/** A therapeutic area: no ancestors, many descendants. */
const THERAPEUTIC_AREA = { id: "OTAR_0000018", name: "genetic, familial or congenital disease" };

/** Open a disease profile and capture the ontology response that feeds the graph. */
async function openOntology(page: Page, efoId: string) {
  const response = waitForOperation<OntologyData>(page, "OntologyQuery");
  await new DiseasePage(page).goto(efoId);
  const { data } = await response;
  await expectSectionLoaded(page, OntologySection.id);
  return data.disease;
}

test.describe("Disease page: Ontology", () => {
  test("shows title, description and the graph with its legend", async ({ page }) => {
    const ontology = new OntologySection(page);
    await openOntology(page, MI.id);

    await test.step("title and description", async () => {
      // the title is followed by a chip with the name of the disease
      await expect(ontology.title).toHaveText(`Ontology${MI.name}`);
      await expect(ontology.description).toHaveText(
        `Ontology subgraph including children, ancestors and therapeutic areas of ${MI.name}. Source: EFO.`
      );
      await expectExternalLink(
        ontology.description.getByRole("link", { name: "EFO" }),
        "https://www.ebi.ac.uk/efo/"
      );
    });

    await test.step("the graph is named after the disease and has a legend and an axis", async () => {
      await expect(ontology.graph).toBeVisible();
      await expect(ontology.graph).toHaveAccessibleName(`Ontology subgraph of ${MI.name}`);
      for (const text of ["therapeutic area", "disease", "descendants", "ancestors", "GENERAL", "SPECIFIC"]) {
        await expect(ontology.legendText(text)).toBeVisible();
      }
      // the disease is named in the legend, next to its colour
      await expect(ontology.legendText(MI.name)).toBeVisible();
    });
  });

  test("draws the disease, its descendants and its ancestors, each linking to its own page", async ({
    page,
  }) => {
    const ontology = new OntologySection(page);
    const disease = await openOntology(page, MI.id);

    const nodes = await ontology.nodes();
    const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
    expect(Object.keys(byId), "no term is drawn twice").toHaveLength(nodes.length);

    await test.step("the disease is the one anchor", async () => {
      const anchors = nodes.filter((node) => node.role === "disease");
      expect(anchors).toHaveLength(1);
      expect(anchors[0]).toMatchObject({ id: MI.id, name: MI.name });
    });

    await test.step("descendants are exactly the children of the disease", async () => {
      const descendants = nodes.filter((node) => node.role === "descendant");
      expect(Object.fromEntries(descendants.map((node) => [node.id, node.name]))).toEqual(
        MI.descendants
      );
      expect(descendants.map((node) => node.id).sort()).toEqual(
        disease.children.map((child) => child.id).sort()
      );
    });

    await test.step("ancestors are exactly the ancestors of the disease", async () => {
      const ancestors = nodes.filter((node) => node.role === "ancestor");
      expect(Object.fromEntries(ancestors.map((node) => [node.id, node.name]))).toEqual(
        MI.ancestors
      );
      expect(ancestors.map((node) => node.id).sort()).toEqual([...disease.ancestors].sort());
    });

    await test.step("every term links to its disease page and its label is its name, possibly shortened", async () => {
      for (const node of nodes) {
        expect(node.id).toMatch(TERM_ID);
        await expect(ontology.nodeLink(node.id)).toHaveCount(1);
        if (node.label.endsWith("...")) {
          expect(node.name.startsWith(node.label.slice(0, -3))).toBe(true);
        } else {
          expect(node.label).toBe(node.name);
        }
      }
    });
  });

  test("hovering a term shows its name and id", async ({ page }) => {
    const ontology = new OntologySection(page);
    await openOntology(page, MI.id);

    await ontology.expectTooltip(MI.id, MI.name);
    await ontology.expectTooltip("MONDO_0004781", MI.descendants.MONDO_0004781);
    await ontology.expectTooltip("MONDO_0005267", MI.ancestors.MONDO_0005267);
  });

  test("clicking a descendant opens its page, and back returns", async ({ page }) => {
    const ontology = new OntologySection(page);
    const disease = new DiseasePage(page);
    await openOntology(page, MI.id);

    const childId = "MONDO_0004781";
    const next = waitForOperation<OntologyData>(page, "OntologyQuery");
    await ontology.nodeLink(childId).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${childId}$`));
    await expect(disease.title).toHaveText(MI.descendants[childId]);
    const { data } = await next;
    expect(data.disease.id).toBe(childId);

    await expectSectionLoaded(page, OntologySection.id);
    await expect(ontology.graph).toHaveAccessibleName(`Ontology subgraph of ${MI.descendants[childId]}`);
    // the page we came from is now one of its ancestors, and it links back
    const nodes = await ontology.nodes();
    expect(nodes.find((node) => node.id === MI.id)).toMatchObject({
      name: MI.name,
      role: "ancestor",
    });
    expect(nodes.find((node) => node.id === childId)).toMatchObject({ role: "disease" });

    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`/disease/${MI.id}$`));
    await expect(disease.title).toHaveText(MI.name);
    await expectSectionLoaded(page, OntologySection.id);
    await expect(ontology.graph).toHaveAccessibleName(`Ontology subgraph of ${MI.name}`);
  });

  test("clicking an ancestor opens its page, where the disease is a descendant", async ({ page }) => {
    const ontology = new OntologySection(page);
    const disease = new DiseasePage(page);
    await openOntology(page, MI.id);

    const parentId = "MONDO_0024643";
    await ontology.nodeLink(parentId).click();
    await expect(page).toHaveURL(new RegExp(`/disease/${parentId}$`));
    await expect(disease.title).toHaveText(MI.ancestors[parentId]);
    await expectSectionLoaded(page, OntologySection.id);

    const nodes = await ontology.nodes();
    expect(nodes.find((node) => node.id === MI.id)).toMatchObject({
      name: MI.name,
      role: "descendant",
    });
    expect(nodes.find((node) => node.id === parentId)).toMatchObject({ role: "disease" });
  });

  test("a leaf disease has no descendants and draws its whole chain of ancestors", async ({
    page,
  }) => {
    const ontology = new OntologySection(page);
    const ancestorsResponse = waitForOperation<AncestorsData>(page, "OntologyAncestorsQuery");
    const disease = await openOntology(page, LEAF.id);
    const { data: resolved } = await ancestorsResponse;

    expect(disease.children, "the API gives the leaf no children").toHaveLength(0);
    expect(disease.parents.map((parent) => parent.id)).toContain(LEAF.parent);
    expect(disease.ancestors.length, "a long chain").toBeGreaterThan(5);

    const nodes = await ontology.nodes();
    expect(nodes.filter((node) => node.role === "descendant")).toHaveLength(0);
    expect(nodes.filter((node) => node.role === "disease").map((node) => node.id)).toEqual([LEAF.id]);
    expect(nodes.filter((node) => node.role === "ancestor").map((node) => node.id).sort()).toEqual(
      [...disease.ancestors].sort()
    );
    // the second request resolves names for every ancestor
    expect(resolved.diseases.rows.map((row) => row.id).sort()).toEqual([...disease.ancestors].sort());
    for (const row of resolved.diseases.rows) {
      expect(nodes.find((node) => node.id === row.id)?.name).toBe(row.name);
    }
    await expect(ontology.graph).toHaveAccessibleName(`Ontology subgraph of ${LEAF.name}`);
  });

  test("a therapeutic area has no ancestors and a long list of descendants", async ({ page }) => {
    const ontology = new OntologySection(page);
    const disease = await openOntology(page, THERAPEUTIC_AREA.id);

    expect(disease.ancestors, "nothing above a therapeutic area").toHaveLength(0);
    expect(disease.children.length, "many descendants").toBeGreaterThan(100);

    const nodes = await ontology.nodes();
    expect(nodes.filter((node) => node.role === "ancestor")).toHaveLength(0);
    expect(nodes.filter((node) => node.role === "disease")).toEqual([
      expect.objectContaining({ id: THERAPEUTIC_AREA.id, name: THERAPEUTIC_AREA.name }),
    ]);
    expect(nodes.filter((node) => node.role === "descendant").map((node) => node.id).sort()).toEqual(
      disease.children.map((child) => child.id).sort()
    );
    expect(new Set(nodes.map((node) => node.id)).size, "no term is drawn twice").toBe(nodes.length);
    // the graph grows with the number of terms rather than clipping them
    const box = await ontology.graph.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThan(500);
  });
});
