/**
 * The columns the associations-on-the-fly table must render, in order.
 *
 * This repeats what the app declares in
 * apps/platform/src/components/AssociationsToolkit/static_datasets on purpose: the tests
 * assert the table against this list, so a column that is dropped, renamed, reordered or
 * wired to the wrong evidence widget fails a test.
 *
 * Only the public columns are listed. Partner-preview columns (OT Validation, OT CRISPR,
 * ENCORE, Novelty Trend) are not rendered by the public profile these tests run against.
 */

export type DataSourceColumn = {
  /** Column id: the API datasource id, used in test ids, the sort param and the focus param */
  id: string;
  /** Header label */
  label: string;
  /** Group shown in the aggregation bar under the headers */
  aggregation: string;
  /** Default weight shown by the weight slider */
  weight: number;
  /** Anchor of the documentation link in the header */
  docsAnchor: string;
  /** Definition id of the evidence widget the cell opens (packages/sections/src/evidence) */
  sectionId: string;
  /** Title of that widget */
  sectionName: string;
};

const source = (
  id: string,
  label: string,
  aggregation: string,
  weight: number,
  docsAnchor: string,
  sectionName: string = label,
  sectionId: string = id
): DataSourceColumn => ({ id, label, aggregation, weight, docsAnchor, sectionId, sectionName });

export const DATA_SOURCE_COLUMNS: readonly DataSourceColumn[] = [
  source("clinical_precedence", "Clinical Precedence", "Clinical", 1, "clinical"),
  source("gwas_credible_sets", "GWAS associations", "Genetic association", 1, "gwas-associations"),
  source("gene_burden", "Gene Burden", "Genetic association", 1, "gene-burden"),
  source("eva", "ClinVar", "Genetic association", 1, "clinvar"),
  source("genomics_england", "GEL PanelApp", "Genetic association", 1, "genomics-england-panelapp"),
  source(
    "gene2phenotype",
    "Gene2phenotype",
    "Genetic association",
    1,
    "gene2phenotype",
    "Gene2Phenotype"
  ),
  source(
    "uniprot_literature",
    "UniProt literature",
    "Genetic association",
    1,
    "uniprot-literature"
  ),
  source(
    "uniprot_variants",
    "UniProt curated variants",
    "Genetic association",
    1,
    "uniprot-variants",
    "UniProt variants"
  ),
  source("orphanet", "Orphanet", "Genetic association", 1, "orphanet"),
  source("clingen", "ClinGen", "Genetic association", 1, "clingen"),
  source("cancer_gene_census", "Cancer Gene Census", "Somatic mutations", 1, "cancer-gene-census"),
  source("intogen", "IntOGen", "Somatic mutations", 1, "intogen"),
  source(
    "eva_somatic",
    "ClinVar (somatic)",
    "Somatic mutations",
    1,
    "clinvar-somatic",
    "EVA somatic"
  ),
  source("cancer_biomarkers", "Cancer Biomarkers", "Somatic mutations", 1, "cancer-biomarkers"),
  source("crispr_screen", "CRISPR Screens", "Affected pathway", 1, "crispr-screens"),
  source("crispr", "Project Score", "Affected pathway", 1, "project-score"),
  source("reactome", "Reactome", "Affected pathway", 1, "reactome"),
  source("europepmc", "Europe PMC", "Literature", 0.2, "europe-pmc", "Europe PMC", "europe_pmc"),
  source("expression_atlas", "Expression Atlas", "RNA expression", 0.2, "expression-atlas"),
  source("impc", "IMPC", "Animal model", 0.2, "impc"),
];

export const DATA_SOURCE_AGGREGATIONS: readonly string[] = [
  ...new Set(DATA_SOURCE_COLUMNS.map((column) => column.aggregation)),
];

export function dataSourceColumn(id: string): DataSourceColumn {
  const column = DATA_SOURCE_COLUMNS.find((candidate) => candidate.id === id);
  if (!column) throw new Error(`"${id}" is not a data source column of the associations table`);
  return column;
}

export type PrioritisationColumn = {
  /** Column id: the key of the prioritisation item in the API */
  id: string;
  /** Header label */
  label: string;
  /** Group shown in the aggregation bar */
  aggregation: "precedence" | "tractability" | "doability" | "safety";
  /** Key of the detail panel the cell opens (`evidence-section-<panelKey>`) */
  panelKey: string;
  /** Definition id of the target widget rendered in that panel (packages/sections/src/target) */
  sectionId: string;
  /** Title of that widget */
  sectionName: string;
};

const factor = (
  id: string,
  label: string,
  aggregation: PrioritisationColumn["aggregation"],
  panelKey: string,
  sectionName: string,
  sectionId: string = panelKey
): PrioritisationColumn => ({ id, label, aggregation, panelKey, sectionId, sectionName });

export const PRIORITISATION_COLUMNS: readonly PrioritisationColumn[] = [
  factor(
    "maxClinicalStage",
    "Target in clinic",
    "precedence",
    "drugs",
    "Drugs and Clinical Candidates"
  ),
  factor(
    "isInMembrane",
    "Membrane protein",
    "tractability",
    "subcellularLocation",
    "Subcellular Location"
  ),
  factor(
    "isSecreted",
    "Secreted protein",
    "tractability",
    "subcellularLocation",
    "Subcellular Location"
  ),
  factor("hasLigand", "Ligand binder", "tractability", "tractability", "Tractability"),
  factor(
    "hasSmallMoleculeBinder",
    "Small molecule binder",
    "tractability",
    "tractability",
    "Tractability"
  ),
  factor("hasPocket", "Predicted pockets", "tractability", "tractability", "Tractability"),
  factor(
    "mouseOrthologMaxIdentityPercentage",
    "Mouse orthologue identity",
    "doability",
    "compGenomics",
    "Comparative Genomics"
  ),
  factor(
    "hasHighQualityChemicalProbes",
    "Chemical probes",
    "doability",
    "chemicalProbes",
    "Chemical Probes"
  ),
  factor(
    "geneticConstraint",
    "Genetic constraint",
    "safety",
    "geneticConstraint",
    "Genetic Constraint"
  ),
  factor("mouseKOScore", "Mouse models", "safety", "mousePhenotypes", "Mouse Phenotypes"),
  factor("geneEssentiality", "Gene essentiality", "safety", "depMapEssentiality", "Cancer DepMap"),
  factor("hasSafetyEvent", "Known safety events", "safety", "safety", "Safety"),
  factor(
    "isCancerDriverGene",
    "Cancer driver gene",
    "safety",
    "cancerHallmarks",
    "Cancer Hallmarks"
  ),
  factor(
    "paralogMaxIdentityPercentage",
    "Paralogues",
    "safety",
    "compGenomics",
    "Comparative Genomics"
  ),
  factor(
    "tissueSpecificity",
    "Tissue specificity",
    "safety",
    "expressions",
    "Baseline Expression",
    "baselineExpression"
  ),
  factor(
    "tissueDistribution",
    "Tissue distribution",
    "safety",
    "expressions",
    "Baseline Expression",
    "baselineExpression"
  ),
  factor(
    "celltypeSpecificity",
    "Cell type specificity",
    "safety",
    "expressions",
    "Baseline Expression",
    "baselineExpression"
  ),
  factor(
    "celltypeDistribution",
    "Cell type distribution",
    "safety",
    "expressions",
    "Baseline Expression",
    "baselineExpression"
  ),
];

export const PRIORITISATION_AGGREGATIONS: readonly string[] = [
  ...new Set(PRIORITISATION_COLUMNS.map((column) => column.aggregation)),
];

export function prioritisationColumn(id: string): PrioritisationColumn {
  const column = PRIORITISATION_COLUMNS.find((candidate) => candidate.id === id);
  if (!column) throw new Error(`"${id}" is not a prioritisation column of the associations table`);
  return column;
}

/** The test id the aggregation bar gives the button of one group. */
export function aggregationTestId(aggregation: string): string {
  return `aggregation-button-${aggregation.toLowerCase().replace(/\s+/g, "-")}`;
}
