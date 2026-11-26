import type { Locator } from "@playwright/test";
import { expect, test } from "../../../fixtures";
import { expectedSectionsFor } from "../../../fixtures/expectedSections";
import { AssociationsTable } from "../../../POM/objects/widgets/AOTF/associationsTable";
import { DATA_SOURCE_COLUMNS } from "../../../POM/objects/widgets/AOTF/columns";
import { stubEuropePmc } from "../../../POM/objects/widgets/shared/sectionDataControls";
import { TargetAssociations } from "../../../POM/objects/widgets/AOTFTarget/targetAssociations";
import { expectSectionLoaded, sectionLocator, sectionTestId } from "../../../utils/sections";

/**
 * Datasource-specific descriptions (release checklist, opentargets/issues#4222).
 *
 * The issue asks for the description of each data source to be correct and shown in the
 * appropriate places. It does not spell out the wording, so "correct" here means the text
 * the app itself defines for the source: packages/sections/src/evidence/<Source>/
 * Description.tsx, with the target symbol and disease name filled in. The expected texts
 * below repeat those definitions on purpose, so an edit of the wording, a description
 * wired to the wrong source, or one dropped from a place fails a test.
 *
 * Where a description is shown:
 *  - the header of each evidence section on /evidence/:ensgId/:efoId;
 *  - the evidence panel that opens under a row of the associations table when a cell is
 *    clicked, on /disease/:id/associations and on /target/:id/associations;
 *  - the header of the table column has no description, only a link to the documentation
 *    of the source (checked here too).
 *
 * Only public sources are covered: the OT CRISPR, OT Validation and ENCORE sections are
 * partner-preview only.
 */

type Source = {
  /** Section definition id (the data-testid of the section without its prefix) */
  sectionId: string;
  /** Column id in the associations table */
  columnId: string;
  /** The description with {s} for the target symbol and {n} for the disease name */
  template: string;
  /** Links inside the description: visible text and href */
  links: readonly { name: string; href: string }[];
};

const SOURCES: readonly Source[] = [
  {
    sectionId: "clinical_precedence",
    columnId: "clinical_precedence",
    template:
      "Clinical candidates and/or approved drugs pharmacologically targeting {s} and indicated for {n}. Source: Open Targets and ChEMBL.",
    links: [
      { name: "Open Targets", href: "https://platform-docs.opentargets.org/evidence#clinical-precedence" },
      { name: "ChEMBL", href: "https://www.ebi.ac.uk/chembl/" },
    ],
  },
  {
    sectionId: "gwas_credible_sets",
    columnId: "gwas_credible_sets",
    template: "95% GWAS credible sets prioritising {s} as likely causal gene for {n}. Source: Open Targets",
    links: [
      { name: "Open Targets", href: "https://platform-docs.opentargets.org/evidence#gwas-associations" },
    ],
  },
  {
    sectionId: "gene_burden",
    columnId: "gene_burden",
    template: "Gene burden analysis prioritising {s} as likely causal gene for {n}. Source: Open Targets",
    links: [{ name: "Open Targets", href: "https://platform-docs.opentargets.org/evidence#gene-burden" }],
  },
  {
    sectionId: "eva",
    columnId: "eva",
    template: "Germline variation associated with {s} on patients affected by {n}. Source: EVA",
    links: [{ name: "EVA", href: "https://www.ebi.ac.uk/eva/" }],
  },
  {
    sectionId: "genomics_england",
    columnId: "genomics_england",
    template:
      "Crowdsourced expert knowledge establishing consensus causation evidence associating {s} with {n}. Source: Genomics England PanelApp",
    links: [{ name: "Genomics England PanelApp", href: "https://panelapp.genomicsengland.co.uk" }],
  },
  {
    sectionId: "gene2phenotype",
    columnId: "gene2phenotype",
    template: "Supporting diagnostic evidence associating {s} with {n}. Source: Gene2Phenotype",
    links: [{ name: "Gene2Phenotype", href: "https://www.ebi.ac.uk/gene2phenotype" }],
  },
  {
    sectionId: "uniprot_literature",
    columnId: "uniprot_literature",
    template:
      "Literature-based curation associating genetic variations affecting {s} protein products with {n}. Source: UniProt",
    links: [{ name: "UniProt", href: "https://www.uniprot.org" }],
  },
  {
    sectionId: "uniprot_variants",
    columnId: "uniprot_variants",
    template:
      "Literature-based curation associating genetic variations affecting {s} protein products with {n}. Source: UniProt",
    links: [{ name: "UniProt", href: "https://www.uniprot.org" }],
  },
  {
    sectionId: "orphanet",
    columnId: "orphanet",
    template: "Expert-reviewed data supporting the relationship between {s} and {n}. Source: Orphanet",
    links: [{ name: "Orphanet", href: "https://www.orpha.net/consor/cgi-bin/Disease_Genes.php" }],
  },
  {
    sectionId: "clingen",
    columnId: "clingen",
    template:
      "Gene-Disease Validity curation assesing the strength of the evidence supporting or refuting a claim that variation in {s} causes {n}. Source: Gene-Disease Validity curation",
    links: [
      {
        name: "Gene-Disease Validity curation",
        href: "https://clinicalgenome.org/curation-activities/gene-disease-validity/",
      },
    ],
  },
  {
    sectionId: "cancer_gene_census",
    columnId: "cancer_gene_census",
    template: "Catalogue of somatic mutations that causally implicate {s} in {n}. Source: COSMIC",
    links: [{ name: "COSMIC", href: "https://cancer.sanger.ac.uk/census" }],
  },
  {
    sectionId: "intogen",
    columnId: "intogen",
    template:
      "Integrative analysis of large-scale mutation data pinpointing {s} as driver gene in {n}. Source: IntOGen",
    links: [{ name: "IntOGen", href: "https://www.intogen.org/search" }],
  },
  {
    sectionId: "eva_somatic",
    columnId: "eva_somatic",
    template: "Somatic variation associated with {s} on patients affected by {n}. Source: EVA",
    links: [{ name: "EVA", href: "https://www.ebi.ac.uk/eva/" }],
  },
  {
    sectionId: "cancer_biomarkers",
    columnId: "cancer_biomarkers",
    template:
      "Expert-curated genomic biomarkers of drug sensitivity, resistance, and toxicity for drugs targeting {s} with an experimental or approved indication of {n}. Source: Cancer Genome Interpreter.",
    links: [
      {
        name: "Cancer Genome Interpreter",
        href: "https://www.cancergenomeinterpreter.org/2018/biomarkers",
      },
    ],
  },
  {
    sectionId: "crispr_screen",
    columnId: "crispr_screen",
    template:
      "CRISPR knockout screens from public CRISPR datasources, associating {s} and CRISPR results. Sources: CRISPRBrain",
    links: [{ name: "CRISPRBrain", href: "https://crisprbrain.org/" }],
  },
  {
    sectionId: "crispr",
    columnId: "crispr",
    template:
      "Cancer cell line dependencies identified using CRISPR-Cas9 whole genome screenings pinpointing a {s} dependency in {n}. Source: Project Score",
    links: [{ name: "Project Score", href: "https://score.depmap.sanger.ac.uk" }],
  },
  {
    sectionId: "reactome",
    columnId: "reactome",
    template:
      "Literature-curated list of pathway reactions affected by genetic alterations or changes in gene expression that lead to disregulation of {s} in the context of {n}. Source: Reactome",
    links: [{ name: "Reactome", href: "https://reactome.org" }],
  },
  {
    sectionId: "europe_pmc",
    columnId: "europepmc",
    template:
      "Text-mining method evaluating the strength of the association between {s} and {n} when they co-occur in the literature. Source: Europe PMC",
    links: [{ name: "Europe PMC", href: "http://europepmc.org" }],
  },
  {
    sectionId: "expression_atlas",
    columnId: "expression_atlas",
    template:
      "Transcriptomic analysis reporting a significant differential expression of {s} when comparing control samples with {n} samples. Source: Expression Atlas",
    links: [{ name: "Expression Atlas", href: "https://www.ebi.ac.uk/gxa/home" }],
  },
  {
    sectionId: "impc",
    columnId: "impc",
    template:
      "Mapping of phenotypes in {s} animal model mutants similar to {n}. Source: IMPC",
    links: [{ name: "IMPC", href: "https://www.mousephenotype.org" }],
  },
];

const source = (sectionId: string): Source => {
  const found = SOURCES.find((candidate) => candidate.sectionId === sectionId);
  if (!found) throw new Error(`no description is defined for "${sectionId}"`);
  return found;
};

type Pair = {
  ensgId: string;
  efoId: string;
  symbol: string;
  name: string;
  /** Sources this pair has evidence in (a subset of its entry in expectedSections.ts) */
  sources: readonly string[];
};

/** Together the pairs hold evidence from every public source. */
const PAIRS: readonly Pair[] = [
  {
    ensgId: "ENSG00000157764",
    efoId: "MONDO_0005105",
    symbol: "BRAF",
    name: "melanoma",
    sources: [
      "eva",
      "eva_somatic",
      "cancer_gene_census",
      "intogen",
      "cancer_biomarkers",
      "clinical_precedence",
      "crispr",
      "europe_pmc",
    ],
  },
  {
    ensgId: "ENSG00000169057",
    efoId: "MONDO_0700092",
    symbol: "MECP2",
    name: "neurodevelopmental disorder",
    sources: [
      "clingen",
      "gene2phenotype",
      "genomics_england",
      "orphanet",
      "reactome",
      "uniprot_literature",
      "uniprot_variants",
      "impc",
    ],
  },
  {
    ensgId: "ENSG00000169174",
    efoId: "EFO_0004611",
    symbol: "PCSK9",
    name: "low density lipoprotein cholesterol measurement",
    sources: ["gene_burden", "gwas_credible_sets"],
  },
  {
    ensgId: "ENSG00000130294",
    efoId: "MONDO_0005559",
    symbol: "KIF1A",
    name: "neurodegenerative disease",
    sources: ["crispr_screen", "expression_atlas"],
  },
];

/**
 * Sources that have evidence but that the associations API gives no score in any row, so
 * their table cell is always empty and there is no panel to open (staging API, release
 * 26.12: not one of 500 rows of several diseases carries an expression_atlas score).
 */
const NEVER_SCORED: ReadonlySet<string> = new Set(["expression_atlas"]);

const fill = (template: string, symbol: string, name: string): string =>
  template.replace("{s}", symbol).replace("{n}", name);

/** Assert a description is exactly the expected text and its links point where they should. */
async function expectDescription(description: Locator, src: Source, symbol: string, name: string) {
  await expect(description, `description of ${src.sectionId}`).toHaveText(
    fill(src.template, symbol, name)
  );
  await expect(description.locator("strong"), `${src.sectionId} bolds the target and the disease`).toHaveText(
    src.template.includes("{n}") ? [symbol, name] : [symbol]
  );
  await expect(description.getByRole("link"), `links of ${src.sectionId}`).toHaveCount(
    src.links.length
  );
  for (const link of src.links) {
    const anchor = description.getByRole("link", { name: link.name, exact: true });
    await expect(anchor, `${src.sectionId} links to ${link.name}`).toHaveAttribute("href", link.href);
  }
}

test.describe("Datasource descriptions: definitions", () => {
  test("every public data source of the associations table has a description under test", () => {
    const covered = new Set(SOURCES.map((s) => s.columnId));
    expect(
      DATA_SOURCE_COLUMNS.filter((column) => !covered.has(column.id)).map((column) => column.id),
      "public columns without a description defined here"
    ).toEqual([]);
    expect([...covered].sort(), "no description for a column the table does not have").toEqual(
      DATA_SOURCE_COLUMNS.map((column) => column.id).sort()
    );
    const inPairs = PAIRS.flatMap((pair) => pair.sources);
    expect(new Set(inPairs).size, "each source is checked on exactly one pair").toBe(inPairs.length);
    expect([...inPairs].sort()).toEqual(SOURCES.map((s) => s.sectionId).sort());
  });

  test("the pairs only list sources that expectedSections.ts says they render", () => {
    for (const pair of PAIRS) {
      const rendered = expectedSectionsFor(`${pair.ensgId}/${pair.efoId}`);
      for (const sectionId of pair.sources) {
        expect(rendered, `${pair.symbol} / ${pair.name}`).toContain(
          sectionTestId(sectionId).replace("section-", "")
        );
      }
    }
  });
});

test.describe("Datasource descriptions: evidence page", () => {
  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  for (const pair of PAIRS) {
    test(`${pair.symbol} in ${pair.name}: every section shows the description of its source`, async ({
      page,
    }) => {
      await page.goto(`/evidence/${pair.ensgId}/${pair.efoId}`);
      for (const sectionId of pair.sources) {
        await test.step(sectionId, async () => {
          const section = await expectSectionLoaded(page, sectionId);
          await expectDescription(
            section.getByTestId("section-description"),
            source(sectionId),
            pair.symbol,
            pair.name
          );
        });
      }
    });

    test(`${pair.symbol} in ${pair.name}: no two sections share a description`, async ({ page }) => {
      await page.goto(`/evidence/${pair.ensgId}/${pair.efoId}`);
      const seen = new Map<string, string[]>();
      for (const sectionId of pair.sources) {
        const section = await expectSectionLoaded(page, sectionId);
        const description = section.getByTestId("section-description");
        await expect(description).not.toBeEmpty();
        const text = (await description.innerText()).replace(/\s+/g, " ").trim();
        seen.set(text, [...(seen.get(text) ?? []), sectionId]);
      }
      const shared = [...seen.values()].filter((ids) => ids.length > 1);
      expect(shared, "sections that show the very same description").toEqual([]);
    });
  }

  test("a pair without a source has no section, so no description, for it", async ({ page }) => {
    const [braf] = PAIRS;
    const mecp2 = PAIRS[1];
    await page.goto(`/evidence/${braf.ensgId}/${braf.efoId}`);
    await expectSectionLoaded(page, "eva");
    for (const sectionId of mecp2.sources) {
      await expect(sectionLocator(page, sectionId), `${sectionId} has no BRAF melanoma evidence`).toHaveCount(0);
    }
  });
});

test.describe("Datasource descriptions: associations table", () => {
  test.describe.configure({ timeout: 240_000 });

  test.beforeEach(async ({ page }) => {
    await stubEuropePmc(page);
  });

  for (const pair of PAIRS) {
    test(`${pair.symbol} row of ${pair.name}: each cell opens a panel with the description of its source`, async ({
      page,
    }) => {
      const aotf = new AssociationsTable(page);
      await aotf.gotoDisease(pair.efoId, { q: pair.symbol });
      const row = aotf.rowByName(pair.symbol);
      await expect(row, `${pair.symbol} should be listed for ${pair.name}`).toHaveCount(1);
      const withData = await aotf.dataColumnIds(row);

      for (const sectionId of pair.sources) {
        const src = source(sectionId);
        await test.step(src.columnId, async () => {
          if (NEVER_SCORED.has(sectionId)) {
            await expect(
              aotf.emptyCell(row, src.columnId),
              `${src.columnId} has no score in the associations API`
            ).toBeVisible();
            return;
          }
          expect(withData, `${pair.symbol} should have a value in ${src.columnId}`).toContain(src.columnId);
          const panel = await aotf.openPanel(row, src.columnId, {
            panelKey: src.columnId,
            sectionId,
          });
          await expectDescription(panel.description, src, pair.symbol, pair.name);
          await aotf.dataCell(row, src.columnId).click();
          await panel.expectClosed();
        });
      }
    });
  }

  test("the header of every public column links to the documentation of its source", async ({
    page,
  }) => {
    const aotf = new AssociationsTable(page);
    await aotf.gotoDisease(PAIRS[0].efoId);
    for (const column of DATA_SOURCE_COLUMNS) {
      await expect(aotf.headerLabel(column.id), column.id).toHaveText(column.label);
      await expect(aotf.docsLink(column.id), `docs link of ${column.id}`).toHaveAttribute(
        "href",
        `https://platform-docs.opentargets.org/evidence#${column.docsAnchor}`
      );
      await expect(aotf.docsLink(column.id)).toHaveAttribute("target", "_blank");
    }
  });

  test("on a target page the panel of a disease row shows the same descriptions", async ({ page }) => {
    const braf = PAIRS[0];
    const aotf = new TargetAssociations(page);
    await aotf.gotoTarget(braf.ensgId, { q: braf.name });
    const row = aotf.rowByName(braf.name);
    await expect(row, `${braf.name} should be listed for ${braf.symbol}`).toHaveCount(1);
    const withData = await aotf.dataColumnIds(row);

    for (const sectionId of braf.sources) {
      const src = source(sectionId);
      await test.step(src.columnId, async () => {
        expect(withData, `${braf.name} should have a value in ${src.columnId}`).toContain(src.columnId);
        const panel = await aotf.openPanel(row, src.columnId, {
          panelKey: src.columnId,
          sectionId,
        });
        await expectDescription(panel.description, src, braf.symbol, braf.name);
        await aotf.dataCell(row, src.columnId).click();
        await panel.expectClosed();
      });
    }
  });
});
