import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "../../../fixtures";
import { MetricsPage } from "../../../POM/page/metrics/metrics";

/**
 * The metrics page is built from a CSV bundled with the app, not from the API. The tests
 * read the same file, so a card showing the wrong row, or a chart losing its data, fails.
 */
const CSV = readFileSync(
  path.resolve(__dirname, "../../../../../apps/platform/src/pages/MetricsPage/metrics.csv"),
  "utf8"
);
const ROWS = CSV.trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [, dataset, kind, metric, , group, value] = line.split(",");
    return { dataset, kind, metric, group, value: Number(value) };
  });

function scalar(dataset: string): number {
  const row = ROWS.find((r) => r.dataset === dataset && r.kind === "scalar" && r.metric === "count");
  if (!row) throw new Error(`metrics.csv has no scalar count for ${dataset}`);
  return row.value;
}

const evidenceTotal = ROWS.filter(
  (r) => r.dataset.startsWith("evidence_") && r.metric === "count"
).reduce((sum, r) => sum + r.value, 0);

/** The card text is d3's ".2~s" (79k, 3M, 7.2M): two significant digits. */
function parseCompact(text: string): number {
  const match = /^(\d+(?:\.\d+)?)([kMGT]?)$/.exec(text.trim());
  if (!match) throw new Error(`"${text}" is not a compact count`);
  const unit = { "": 1, k: 1e3, M: 1e6, G: 1e9, T: 1e12 }[match[2] as "" | "k" | "M" | "G" | "T"];
  return Number(match[1]) * unit;
}

const CARDS = [
  { slug: "targets", label: "Targets", expected: () => scalar("target") },
  { slug: "diseases", label: "Diseases", expected: () => scalar("disease") },
  { slug: "drugs-and-clinical-candidates", label: "Drugs and Clinical Candidates", expected: () => scalar("drug_molecule") },
  { slug: "clinical-reports", label: "Clinical Reports", expected: () => scalar("clinical_report") },
  { slug: "gwas-molqtl-studies", label: "GWAS/molQTL Studies", expected: () => scalar("study") },
  { slug: "target-disease-evidence", label: "Target-Disease Evidence", expected: () => evidenceTotal },
  { slug: "direct-target-disease-associations", label: "Direct Target-Disease Associations", expected: () => scalar("association_overall_direct") },
  { slug: "indirect-target-disease-associations", label: "Indirect Target-Disease Associations", expected: () => scalar("association_overall_indirect") },
  { slug: "credible-sets", label: "Credible Sets", expected: () => scalar("credible_set") },
  { slug: "variants", label: "Variants", expected: () => scalar("variant") },
];

const WIDGETS = [
  {
    id: "disease-target-associations",
    title: "Evidence and Associations",
    description: /Target-disease evidence and associations by data source and data type\./,
    links: [
      ["evidence", "https://platform-docs.opentargets.org/evidence"],
      ["associations", "https://platform-docs.opentargets.org/associations"],
    ],
  },
  {
    id: "drugs",
    title: "Drugs and Clinical Candidates",
    description: /Drugs, clinical candidates and clinical reports by stage\./,
    links: [["Drugs, clinical candidates and clinical reports", "https://platform-docs.opentargets.org/drug"]],
  },
  {
    id: "studies-and-credible-sets",
    title: "GWAS and molQTL",
    description: /Studies, credible sets and colocalisations by type\./,
    links: [
      ["Studies", "https://platform-docs.opentargets.org/study"],
      ["credible sets", "https://platform-docs.opentargets.org/credible-set"],
      ["colocalisations", "https://platform-docs.opentargets.org/gentropy/colocalisation"],
    ],
  },
  {
    id: "variants",
    title: "Variants",
    description: /Phenotype-associated variants by most severe consequence\./,
    links: [
      ["Phenotype-associated variants", "https://platform-docs.opentargets.org/variant"],
      ["most severe consequence", "https://www.ensembl.org/tools/vep"],
    ],
  },
];

const DRUG_STAGES = [
  "Unknown", "Preclinical", "IND", "Early phase I", "Phase I", "Phase I/II",
  "Phase II", "Phase II/III", "Phase III", "Preapproval", "Approval",
];

test.describe("Metrics page", () => {
  test("shows the title, the document title and every card and chart @smoke", async ({ page }) => {
    const metrics = new MetricsPage(page);
    await metrics.goto();

    await expect(page).toHaveTitle("Data Metrics | Open Targets Platform");
    await expect(metrics.title).toHaveText("Open Targets Platform Metrics");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Open Targets Platform Metrics");
    await expect(metrics.cards).toHaveCount(CARDS.length);
    for (const widget of WIDGETS) await expect(metrics.widgetTitle(widget.id)).toHaveText(widget.title);
  });

  test("the cards are in the documented order with their labels", async ({ page }) => {
    const metrics = new MetricsPage(page);
    await metrics.goto();

    await expect(metrics.cards.getByTestId("metrics-card-label")).toHaveText(CARDS.map((c) => c.label));
  });

  test("each card shows its count from the metrics data, in compact format", async ({ page }) => {
    const metrics = new MetricsPage(page);
    await metrics.goto();

    for (const card of CARDS) {
      await test.step(card.label, async () => {
        await expect(metrics.card(card.slug)).toBeVisible();
        await expect(metrics.cardLabel(card.slug)).toHaveText(card.label);
        await expect(metrics.cardValue(card.slug)).toHaveText(/^\d+(\.\d+)?[kMGT]?$/);
        const shown = parseCompact(await metrics.cardValue(card.slug).innerText());
        const expected = card.expected();
        expect(expected, "the metrics file has a real count").toBeGreaterThan(0);
        // d3 ".2~s" keeps two significant digits: within 5% of the true count.
        expect(Math.abs(shown - expected) / expected).toBeLessThan(0.05);
      });
    }
  });

  for (const widget of WIDGETS) {
    test(`widget "${widget.title}" has its description, documentation links and a chart`, async ({ page }) => {
      const metrics = new MetricsPage(page);
      await metrics.goto();

      await expect(metrics.widget(widget.id)).toBeVisible();
      await expect(metrics.widgetTitle(widget.id)).toHaveText(widget.title);
      await expect(metrics.widgetDescription(widget.id)).toContainText(widget.description);
      await expect(metrics.widgetLinks(widget.id)).toHaveCount(widget.links.length);
      for (const [name, href] of widget.links) {
        const link = metrics.widgetDescription(widget.id).getByRole("link", { name, exact: true });
        await expect(link, name).toHaveAttribute("href", new RegExp(`^\\s*${href.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`));
      }
      await expect(metrics.widgetContent(widget.id).getByText(/\d/).first()).toBeAttached();
      await expect(metrics.widgetContent(widget.id)).not.toBeEmpty();
    });
  }

  test("the evidence and associations chart has its three facets and seven data types", async ({ page }) => {
    const metrics = new MetricsPage(page);
    await metrics.goto();

    const content = metrics.widgetContent("disease-target-associations");
    for (const facet of ["Evidence", "Direct associations", "Indirect associations"]) {
      await expect(metrics.marks("disease-target-associations", "fx-axis tick label").getByText(facet, { exact: true }), facet).toBeAttached();
    }
    for (const source of ["Clinical Precedence", "GWAS Associations", "Gene Burden", "ClinVar", "Reactome", "Europe PMC", "IMPC"]) {
      // Capitalised by CSS, so the raw text may differ in case.
      await expect(content.getByText(new RegExp(`^${source}$`, "i")).first(), source).toBeAttached();
    }
    for (const dataType of ["Clinical", "Genetic association", "Somatic mutations", "Affected pathway", "Literature", "RNA expression", "Animal model"]) {
      await expect(content.getByText(new RegExp(`^${dataType}$`, "i")).first(), dataType).toBeAttached();
    }
    await expect(metrics.marks("disease-target-associations", "bar").first()).toBeVisible();
  });

  test("the drugs chart has a bubble and a bar for every clinical stage", async ({ page }) => {
    const metrics = new MetricsPage(page);
    await metrics.goto();

    const content = metrics.widgetContent("drugs");
    await expect(content.getByText("Drugs and candidates by max stage")).toBeVisible();
    await expect(content.getByText("Clinical reports", { exact: true })).toBeVisible();
    for (const stage of DRUG_STAGES) {
      await expect(content.getByLabel(new RegExp(`^${stage}: [\\d,]+ drugs$`)), stage).toHaveCount(1);
      await expect(content.getByLabel(new RegExp(`^${stage}: [\\d,]+ clinical reports$`)), stage).toHaveCount(1);
    }
    for (const stage of ["Phase IV", "Withdrawal"]) {
      await expect(content.getByLabel(new RegExp(`^${stage}: [\\d,]+ clinical reports$`)), stage).toHaveCount(1);
    }
    const total = ROWS.find((r) => r.dataset === "drug_molecule" && r.kind === "scalar")?.value ?? 0;
    expect(total).toBeGreaterThan(0);
  });

  test("the GWAS and molQTL charts show a total that matches the card, and the study types", async ({ page }) => {
    const metrics = new MetricsPage(page);
    await metrics.goto();

    const content = metrics.widgetContent("studies-and-credible-sets");
    const charts = [
      { title: "Studies by study type", dataset: "study" },
      { title: "Credible sets by study type", dataset: "credible_set" },
      { title: "Colocalisation by type", dataset: "colocalisation" },
    ];
    for (const chart of charts) {
      await expect(content.getByText(`${chart.title}(total: ${scalar(chart.dataset).toLocaleString("en-US")})`)).toBeVisible();
    }
    for (const type of ["GWAS", "eQTL", "sQTL", "tuQTL", "sceQTL", "pQTL"]) {
      await expect(content.getByText(type, { exact: true }).first(), type).toBeAttached();
    }
    for (const pair of ["GWAS-GWAS", "GWAS-eQTL", "GWAS-sQTL", "GWAS-tuQTL", "GWAS-sceQTL", "GWAS-pQTL"]) {
      await expect(content.getByText(pair, { exact: true }), pair).toBeAttached();
    }
    await expect(content.getByText(/^\d+(\.\d+)?%$/).first()).toBeVisible();
  });

  test("the variants chart lists consequences by count, and Show more reveals the rest", async ({ page }) => {
    const metrics = new MetricsPage(page);
    await metrics.goto();

    const content = metrics.widgetContent("variants");
    await expect(content.getByText("Most severe consequence")).toBeVisible();
    for (const impact of ["High", "Moderate", "Low", "Modifier"]) {
      await expect(content.getByText(impact, { exact: true }), impact).toBeVisible();
    }
    await expect(content.getByText("Likely impact")).toBeVisible();
    await expect(metrics.consequenceLabels.first()).toHaveText("Intron");
    await expect(metrics.consequenceLabels.nth(2)).toHaveText("Missense");
    const total = await metrics.consequenceLabels.count();
    expect(total).toBeGreaterThan(12);

    // The counts decrease down the chart.
    const counts = (await metrics.marks("variants", "text").last().locator("text").allTextContents()).map(
      (text) => Number(text.replace(/,/g, ""))
    );
    expect(counts.length).toBe(total);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));

    await expect(metrics.showMoreButton).toHaveText("Show more");
    const collapsed = (await metrics.widgetContent("variants").boundingBox())?.height ?? 0;
    await metrics.showMoreButton.click();
    await expect(metrics.showMoreButton).toHaveText("Show less");
    await expect
      .poll(async () => (await metrics.widgetContent("variants").boundingBox())?.height ?? 0)
      .toBeGreaterThan(collapsed + 100);

    await metrics.showMoreButton.click();
    await expect(metrics.showMoreButton).toHaveText("Show more");
    await expect
      .poll(async () => (await metrics.widgetContent("variants").boundingBox())?.height ?? 0)
      .toBeLessThanOrEqual(collapsed + 1);
  });

  test("the page is usable at a phone width, with one card per row", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    const metrics = new MetricsPage(page);
    await metrics.goto();

    await expect(metrics.cards).toHaveCount(CARDS.length);
    const first = await metrics.cards.nth(0).boundingBox();
    const second = await metrics.cards.nth(1).boundingBox();
    expect(second?.y ?? 0).toBeGreaterThan((first?.y ?? 0) + (first?.height ?? 0) - 1);
    await expect(metrics.widget("drugs")).toBeAttached();
  });

  test("a path under /metrics that does not exist shows the 404 page", async ({ page, pageHealth }) => {
    pageHealth.allow(/404 page is displayed/, "opens a route that does not exist", "error-ui");
    await page.goto("/metrics/does-not-exist");
    await expect(page.getByTestId("not-found-page")).toBeVisible();
  });
});
