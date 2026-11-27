/**
 * The parts of the app the suite covers, for the report overview page.
 *
 * A spec file belongs to the first area whose `match` its path (relative to e2e/)
 * starts with, so list a specific path before the folder that contains it. A spec that
 * matches nothing is listed under "Other": add an entry here when you add a folder.
 */
export const AREAS = [
  {
    name: "Whole app",
    description:
      "Every route loads, shows its header and renders exactly the sections it should, and each page gets its data. The checks that go red when any page breaks.",
    match: ["health/routes", "health/graphql"],
  },
  {
    name: "Shared table",
    description:
      "Search, sorting, paging, page size, column picker, export and API query on the table component every section uses.",
    match: ["health/table"],
  },
  {
    name: "Search",
    description:
      "The search dialog (Cmd/Ctrl+K, top hit, grouped results, filters, recent searches) and the search results page.",
    match: ["pages/search/"],
  },
  {
    name: "Home and site chrome",
    description: "Home page, header menu, footer and page titles.",
    match: ["pages/homepage", "pages/site/navigation", "pages/site/footer"],
  },
  {
    name: "Error pages",
    description: "The 404 page for unknown routes and unknown ids, and private routes.",
    match: ["pages/site/notFound", "pages/site/privateRoutes"],
  },
  {
    name: "Target page",
    description:
      "Header, external links, Profile and Associated diseases tabs, and the list of sections each test target renders.",
    match: ["pages/target/targetPage", "pages/target/targetProfile"],
  },
  {
    name: "Target page sections",
    description:
      "Each profile section in depth: drugs, tractability, safety, chemical probes, expression, DepMap, subcellular location, gene ontology, genetic constraint, structure, interactions, pathways, cancer hallmarks, mouse phenotypes, comparative genomics, bibliography, molQTL credible sets, pharmacogenomics.",
    match: ["pages/target/sections/"],
  },
  {
    name: "Target associations",
    description:
      "The associated diseases table on the target page: rows, sorting, filters, evidence on click, export.",
    match: ["pages/target/targetAssociations"],
  },
  {
    name: "Disease page",
    description:
      "Header, cross-references, synonyms, tabs, sticky section menu and the list of sections.",
    match: ["pages/disease/diseaseProfile", "pages/disease.spec"],
  },
  {
    name: "Disease page sections",
    description: "Ontology, phenotypes, drugs, GWAS studies and bibliography.",
    match: ["pages/disease/sections/"],
  },
  {
    name: "Disease associations",
    description:
      "The associated targets table: rows, score columns, sorting, paging, prioritisation view, filters, pinning, export, and the evidence opened from a score cell.",
    match: ["pages/disease/associatedTargets"],
  },
  {
    name: "Drug page",
    description:
      "Header and all six sections: mechanisms of action, indications, warnings, pharmacogenetics, adverse events, bibliography.",
    match: ["pages/drug/"],
  },
  {
    name: "Variant page",
    description:
      "Header, alleles, population frequencies, cross-references, long alleles and the list of sections.",
    match: ["pages/variant/variantProfileHeader", "pages/variant/variantPageNavigation"],
  },
  {
    name: "Variant page sections",
    description:
      "In-silico predictors, variant effect predictor, ClinVar, UniProt variants, molecular structure, GWAS and molQTL credible sets, enhancer-to-gene predictions, pharmacogenetics.",
    match: ["pages/variant/"],
  },
  {
    name: "Study page",
    description:
      "Header fields for GWAS and molQTL studies, the credible sets tables and shared trait studies.",
    match: ["pages/study/"],
  },
  {
    name: "Credible set page",
    description:
      "Header for a GWAS and a molQTL credible set and the list of sections each renders.",
    match: ["pages/credibleSet/credibleSetPage"],
  },
  {
    name: "Credible set sections",
    description:
      "Variants in the set, locus-to-gene predictions, GWAS and molQTL colocalisation, enhancer-to-gene predictions.",
    match: ["pages/credibleSet/sections/"],
  },
  {
    name: "Evidence page",
    description:
      "Header, links to the target and disease, and the list of evidence sections for a target-disease pair.",
    match: ["pages/evidence/evidencePage"],
  },
  {
    name: "Evidence page sections",
    description:
      "Each evidence source in depth: genetic, somatic, clinical, literature and the rest.",
    match: ["pages/evidence/"],
  },
  {
    name: "Downloads page",
    description: "Dataset cards, filters, basket and network view.",
    match: ["pages/site/downloads"],
  },
  {
    name: "API and metrics pages",
    description: "API playground, metrics page, llms.txt and robots.txt.",
    match: ["pages/site/apiPage", "pages/metrics/", "llmsTxt"],
  },
  {
    name: "Test harness",
    description:
      "Checks on the tests themselves: the page health guard must catch a broken page.",
    match: ["harness/"],
  },
];

export const OTHER_AREA = {
  name: "Other",
  description: "Spec files not yet assigned to an area in scripts/reportAreas.mjs.",
  match: [],
};

/** The area a spec file belongs to. `file` is relative to e2e/. */
export function areaOf(file) {
  return AREAS.find((area) => area.match.some((prefix) => file.startsWith(prefix))) ?? OTHER_AREA;
}
