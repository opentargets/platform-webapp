import { expect, type Locator, type Page } from "@playwright/test";
import { sectionLocator } from "../../../../utils/sections";

/**
 * A term drawn in the ontology graph: its full name (the text's <title>), the label as drawn
 * (shortened with "..." when the column is narrow), its id from the link, its role from its colour.
 */
export type OntologyNode = {
  name: string;
  label: string;
  id: string;
  role: "disease" | "descendant" | "ancestor";
};

const ROLE_BY_FILL: Record<string, OntologyNode["role"]> = {
  "#ff6350": "disease",
  "#85b8df": "descendant",
  "#3489ca": "ancestor",
};

/**
 * Disease page: Ontology section. An SVG subgraph of the disease with its descendants and
 * ancestors. Every term is a link to its own disease page, with a tooltip "<name> | ID: <id>".
 */
export class OntologySection {
  static readonly id = "ontology";
  readonly section: Locator;

  constructor(readonly page: Page) {
    this.section = sectionLocator(page, OntologySection.id);
  }

  get title(): Locator {
    return this.section.getByTestId("section-ontology-header");
  }

  get description(): Locator {
    return this.section.getByTestId("section-description");
  }

  /** The graph. Its accessible name is "Ontology subgraph of <disease name>". */
  get graph(): Locator {
    return this.section.getByRole("img", { name: /^Ontology subgraph of / });
  }

  /** One link per term in the graph (the disease itself, descendants and ancestors). */
  get nodeLinks(): Locator {
    return this.graph.locator("a");
  }

  /** The link of one term, by its disease id. */
  nodeLink(id: string): Locator {
    return this.graph.locator(`a[href="/disease/${id}"]`);
  }

  /** A legend or axis label the graph draws before the nodes (the first match in document order). */
  legendText(text: string): Locator {
    return this.graph.getByText(text, { exact: true }).first();
  }

  /** Read every node: label as drawn, id from the link, role from the fill of its marker. */
  async nodes(): Promise<OntologyNode[]> {
    await expect(this.nodeLinks.first()).toBeVisible();
    const raw = await this.nodeLinks.evaluateAll((links) =>
      links.map((link) => ({
        name: link.querySelector("text > title")?.textContent?.trim() ?? "",
        label: Array.from(link.querySelector("text")?.childNodes ?? [])
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join("")
          .trim(),
        href: link.getAttribute("href") ?? "",
        fill: (link.querySelector("circle, rect")?.getAttribute("fill") ?? "").toLowerCase(),
      }))
    );
    return raw.map(({ name, label, href, fill }) => {
      const role = ROLE_BY_FILL[fill];
      expect(role, `the marker of "${name}" has a known colour (${fill})`).toBeTruthy();
      return { name, label, id: href.replace(/^\/disease\//, ""), role };
    });
  }

  /** Hover a term and assert its tooltip reads "<name> | ID: <id>". */
  async expectTooltip(id: string, name: string): Promise<void> {
    await this.nodeLink(id).hover();
    // the tooltip of the previously hovered term may still be fading out
    await expect(
      this.page.getByRole("tooltip").filter({ hasText: `ID: ${id}` })
    ).toHaveText(`${name} | ID: ${id}`);
  }
}
