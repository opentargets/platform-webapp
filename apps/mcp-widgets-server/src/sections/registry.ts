/**
 * Registry of all section-based MCP widget tools.
 *
 * Each entry defines one MCP tool that renders a section Body component
 * from packages/sections. The bundle file, GQL query, and operation name
 * are auto-derived at build/server-startup time from the sectionPath.
 *
 * Naming convention for toolName: get_{entity}_{section_snake_case}_widget
 * Bundle files: {entity}-{section-kebab-case}.js (e.g. target-tractability.js)
 */
export type SectionDef = {
  /** Entity type — determines Body prop shape and URL variable convention */
  entity: "target" | "disease" | "drug" | "evidence" | "variant" | "credibleSet" | "study";
  /** Path relative to packages/sections/src (e.g. "target/Tractability") */
  sectionPath: string;
  /** MCP tool name (e.g. "get_target_tractability_widget") */
  toolName: string;
  /** Human-readable description shown to the LLM when selecting tools */
  description: string;
  /** Input parameters. One for single-entity sections, two for evidence. */
  inputParams: ReadonlyArray<{ name: string; description: string }>;
  /**
   * Extra static variables merged into the prefetch GraphQL request alongside
   * the primary input(s). Used for pagination defaults (size, index, cursor).
   */
  prefetchExtraVariables?: Record<string, unknown>;
  /**
   * Override the auto-detected primary GQL query. Use when the section's query
   * variable doesn't match the tool's input param. Only applies when directFetch
   * is unset — every current entry is directFetch, so this is currently unused.
   */
  primaryPrefetch?: { query: string; operationName: string };
  /**
   * Additional queries run after the primary, same shape as WidgetDef.prefetch.extraPrefetches.
   */
  extraPrefetches?: Array<{
    query: string;
    operationName: string;
    variables: (inputValue: string, primaryData: unknown) => Record<string, unknown>;
    filteredBy?: {
      requestVarName: string;
      itemIdField: string;
      responseKey: string;
    };
  }>;
  /**
   * Experimental: skip server-side prefetch entirely and let the widget iframe fetch
   * the GraphQL API directly, allowlisted via CSP connectDomains. When set, no
   * `prefetch` config is derived and the fetch interceptor is bypassed client-side.
   */
  directFetch?: boolean;
};

const TARGET_INPUT = [
  { name: "ensemblId", description: "Ensembl gene ID (e.g. ENSG00000157764 for BRAF)" },
] as const;

const DISEASE_INPUT = [
  { name: "efoId", description: "EFO disease ID (e.g. EFO_0000249 for Alzheimer disease)" },
] as const;

const DRUG_INPUT = [
  { name: "chemblId", description: "ChEMBL drug ID (e.g. CHEMBL192 for ibuprofen)" },
] as const;

const EVIDENCE_INPUT = [
  { name: "ensemblId", description: "Ensembl gene ID (e.g. ENSG00000157764 for BRAF)" },
  { name: "efoId", description: "EFO disease ID (e.g. EFO_0000249)" },
] as const;

const CREDIBLE_SET_INPUT = [
  { name: "studyLocusId", description: "Study locus ID of the credible set (e.g. 28a6eae8368c995192905821ee578ae8)" },
] as const;

const VARIANT_INPUT = [
  { name: "variantId", description: "Variant ID in chromosome_position_ref_alt format (e.g. 19_44908822_C_T)" },
] as const;

const STUDY_INPUT = [
  { name: "studyId", description: "GWAS study ID (e.g. GCST90002357)" },
] as const;

export const SECTION_REGISTRY: SectionDef[] = [
  // ── TARGET ──────────────────────────────────────────────────────────────────
  {
    entity: "target",
    sectionPath: "target/CancerHallmarks",
    toolName: "get_target_cancer_hallmarks_widget",
    description:
      "Shows cancer hallmark annotations for a target gene — which hallmarks it promotes or " +
      "suppresses, with supporting publication evidence.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/ChemicalProbes",
    toolName: "get_target_chemical_probes_widget",
    description:
      "Shows chemical probes available for a target gene — highly selective tool compounds " +
      "used in pharmacological research, with probe quality scores and sources.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/ComparativeGenomics",
    toolName: "get_target_comparative_genomics_widget",
    description:
      "Shows comparative genomics data for a target gene — orthologues across species " +
      "(human, mouse, rat, zebrafish, etc.) with homology scores.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/DepMap",
    toolName: "get_target_depmap_widget",
    description:
      "Shows DepMap CRISPR gene essentiality data for a target — cancer cell line " +
      "dependency scores across tissue types from the Cancer Dependency Map.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/Drugs",
    toolName: "get_target_drugs_widget",
    description:
      "Shows drugs and clinical candidates associated with a target gene — approved drugs, " +
      "clinical-stage compounds, mechanisms of action, and disease indications.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/BaselineExpression",
    toolName: "get_target_baseline_expression_widget",
    description:
      "Shows baseline RNA expression levels for a target gene across tissues and cell types — " +
      "median TPM values, tissue specificity scores, and distribution scores from GTEx, HPA, " +
      "and other sources.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/GeneOntology",
    toolName: "get_target_gene_ontology_widget",
    description:
      "Shows Gene Ontology (GO) annotations for a target gene — molecular functions, " +
      "biological processes, and cellular components.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/GeneticConstraint",
    toolName: "get_target_genetic_constraint_widget",
    description:
      "Shows genetic constraint metrics for a target gene (pLI, LOEUF, Z-scores) from " +
      "gnomAD — indicating intolerance to loss-of-function variants.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/MousePhenotypes",
    toolName: "get_target_mouse_phenotypes_widget",
    description:
      "Shows mouse phenotype data for a target gene from IMPC — phenotypic categories " +
      "observed in knockout mice with significance scores.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/Pathways",
    toolName: "get_target_pathways_widget",
    description:
      "Shows Reactome pathway memberships for a target gene — biological pathways and " +
      "hierarchical pathway categories.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/Pharmacogenomics",
    toolName: "get_target_pharmacogenomics_widget",
    description:
      "Shows pharmacogenomics data for a target gene — genetic variants that affect drug " +
      "response and their clinical annotations from PharmGKB.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/QTLCredibleSets",
    toolName: "get_target_qtl_credible_sets_widget",
    description:
      "Shows QTL credible sets linked to a target gene — eQTL and sQTL fine-mapped " +
      "credible sets from GTEx and other QTL datasets.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/Safety",
    toolName: "get_target_safety_widget",
    description:
      "Shows target safety information — adverse effects, safety risk information, " +
      "and experimental toxicity data from curated sources.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },
  {
    entity: "target",
    sectionPath: "target/Tractability",
    toolName: "get_target_tractability_widget",
    description:
      "Shows tractability assessment for a target gene — small molecule, antibody, PROTAC, " +
      "and other drug modality predictions with supporting evidence buckets.",
    inputParams: TARGET_INPUT,
    directFetch: true,
  },

  // ── DISEASE ─────────────────────────────────────────────────────────────────
  {
    entity: "disease",
    sectionPath: "disease/Drugs",
    toolName: "get_disease_drugs_widget",
    description:
      "Shows drugs approved or in clinical trials for a disease — drug names, " +
      "clinical phases, mechanisms of action, and linked targets.",
    inputParams: DISEASE_INPUT,
    directFetch: true,
  },
  {
    entity: "disease",
    sectionPath: "disease/OTProjects",
    toolName: "get_disease_ot_projects_widget",
    description:
      "Shows Open Targets experimental projects related to a disease — OTAR-funded " +
      "functional genomics and validation studies.",
    inputParams: DISEASE_INPUT,
    directFetch: true,
  },
  {
    entity: "disease",
    sectionPath: "disease/Ontology",
    toolName: "get_disease_ontology_widget",
    description:
      "Shows the disease ontology subgraph for a disease — its position in the EFO " +
      "hierarchy with parent and child disease terms.",
    inputParams: DISEASE_INPUT,
    directFetch: true,
  },
  {
    entity: "disease",
    sectionPath: "disease/Phenotypes",
    toolName: "get_disease_phenotypes_widget",
    description:
      "Shows phenotype annotations for a disease — HPO phenotype terms linked to " +
      "the disease with evidence from curated sources.",
    inputParams: DISEASE_INPUT,
    directFetch: true,
  },

  // ── DRUG ────────────────────────────────────────────────────────────────────
  {
    entity: "drug",
    sectionPath: "drug/AdverseEvents",
    toolName: "get_drug_adverse_events_widget",
    description:
      "Shows adverse event data for a drug from FDA FAERS — significant adverse events " +
      "by MedDRA term with likelihood ratio scores.",
    inputParams: DRUG_INPUT,
    directFetch: true,
  },
  {
    entity: "drug",
    sectionPath: "drug/Indications",
    toolName: "get_drug_indications_widget",
    description:
      "Shows drug clinical indications with investigational and approved indications from clinical trial records, including disease names, maximum clinical stage, and individual trial records in a detail panel.",
    inputParams: DRUG_INPUT,
    directFetch: true,
  },
  {
    entity: "drug",
    sectionPath: "drug/DrugWarnings",
    toolName: "get_drug_warnings_widget",
    description:
      "Shows drug safety warnings for a drug — black box warnings, withdrawn status, " +
      "and year of withdrawal with regulatory authority details.",
    inputParams: DRUG_INPUT,
    directFetch: true,
  },
  {
    entity: "drug",
    sectionPath: "drug/MechanismsOfAction",
    toolName: "get_drug_mechanisms_of_action_widget",
    description:
      "Shows mechanisms of action for a drug — target proteins, action types " +
      "(agonist, antagonist, inhibitor, etc.), and source references.",
    inputParams: DRUG_INPUT,
    directFetch: true,
  },
  {
    entity: "drug",
    sectionPath: "drug/Pharmacogenomics",
    toolName: "get_drug_pharmacogenomics_widget",
    description:
      "Shows pharmacogenomics data for a drug — genetic variants that affect drug " +
      "response, phenotype categories, and clinical significance.",
    inputParams: DRUG_INPUT,
    directFetch: true,
  },

  // ── EVIDENCE ─────────────────────────────────────────────────────────────────
  {
    entity: "evidence",
    sectionPath: "evidence/CRISPR",
    toolName: "get_evidence_crispr_widget",
    description:
      "Shows CRISPR screen evidence linking a target to a disease — cancer cell " +
      "line screens showing gene essentiality in disease-relevant models.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/CRISPRScreen",
    toolName: "get_evidence_crispr_screen_widget",
    description:
      "Shows CRISPR modifier screen evidence — genetic interaction screens " +
      "identifying target-disease associations through functional genomics.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/CancerBiomarkers",
    toolName: "get_evidence_cancer_biomarkers_widget",
    description:
      "Shows cancer biomarker evidence — genomic alterations in the target gene " +
      "associated with drug response in specific cancer types.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/CancerGeneCensus",
    toolName: "get_evidence_cancer_gene_census_widget",
    description:
      "Shows Cancer Gene Census evidence — curated cancer driver gene annotations " +
      "from COSMIC linking the target to the disease.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/ClinicalPrecedence",
    toolName: "get_evidence_clinical_precedence_widget",
    description:
      "Shows clinical precedence evidence linking a target gene to a disease — approved and " +
      "investigational drugs, clinical phases, and trial outcomes.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/ClinGen",
    toolName: "get_evidence_clingen_widget",
    description:
      "Shows ClinGen curated evidence — expert-curated gene-disease validity " +
      "classifications with supporting evidence summaries.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/EVA",
    toolName: "get_evidence_eva_widget",
    description:
      "Shows ClinVar/EVA genetic evidence — clinically interpreted variants in the " +
      "target gene associated with the disease, with pathogenicity classifications.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/EVASomatic",
    toolName: "get_evidence_eva_somatic_widget",
    description:
      "Shows ClinVar somatic evidence — somatic variants in the target gene " +
      "associated with the disease from clinical submissions.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/ExpressionAtlas",
    toolName: "get_evidence_expression_atlas_widget",
    description:
      "Shows Expression Atlas evidence — differential expression studies showing " +
      "the target gene is up- or down-regulated in the disease context.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/GWASCredibleSets",
    toolName: "get_evidence_gwas_credible_sets_widget",
    description:
      "Shows GWAS credible set evidence — fine-mapped GWAS loci where the target " +
      "gene is the top L2G candidate for the disease.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/Gene2Phenotype",
    toolName: "get_evidence_gene2phenotype_widget",
    description:
      "Shows Gene2Phenotype curated evidence — expert-curated gene-disease " +
      "associations from the G2P database with confidence levels.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/GeneBurden",
    toolName: "get_evidence_gene_burden_widget",
    description:
      "Shows gene burden evidence — rare variant collapsing analyses associating " +
      "the target gene with the disease from biobank studies.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/GenomicsEngland",
    toolName: "get_evidence_genomics_england_widget",
    description:
      "Shows Genomics England PanelApp evidence — curated gene-disease associations " +
      "from the GEL rare disease gene panels.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/Impc",
    toolName: "get_evidence_impc_widget",
    description:
      "Shows IMPC mouse model evidence — phenotypes observed in knockout mice " +
      "that map to the human disease.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/IntOgen",
    toolName: "get_evidence_intogen_widget",
    description:
      "Shows IntOGen cancer driver evidence — somatic mutation enrichment analysis " +
      "identifying the target gene as a cancer driver in the disease.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/OTCRISPR",
    toolName: "get_evidence_ot_crispr_widget",
    description:
      "Shows Open Targets CRISPR evidence — OT-funded CRISPR validation screens " +
      "supporting the target-disease association.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/OTEncore",
    toolName: "get_evidence_ot_encore_widget",
    description:
      "Shows Open Targets ENCORE combinatorial CRISPR screen evidence — genetic " +
      "interaction data from OT's double-KO screens.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/OTValidation",
    toolName: "get_evidence_ot_validation_widget",
    description:
      "Shows Open Targets validation evidence — OT-funded experimental validation " +
      "studies supporting the target-disease hypothesis.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/Orphanet",
    toolName: "get_evidence_orphanet_widget",
    description:
      "Shows Orphanet rare disease evidence — curated gene-disease associations " +
      "from the Orphanet rare disease database.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/Reactome",
    toolName: "get_evidence_reactome_widget",
    description:
      "Shows Reactome pathway evidence — pathway disruption events linking the " +
      "target gene to the disease through biological pathways.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/UniProtLiterature",
    toolName: "get_evidence_uniprot_literature_widget",
    description:
      "Shows UniProt literature evidence — manually curated disease annotations " +
      "from UniProtKB with supporting PubMed references.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },
  {
    entity: "evidence",
    sectionPath: "evidence/UniProtVariants",
    toolName: "get_evidence_uniprot_variants_widget",
    description:
      "Shows UniProt variant evidence — manually curated disease-causing variants " +
      "in the target gene from UniProtKB.",
    inputParams: EVIDENCE_INPUT,
    directFetch: true,
  },

  // ── CREDIBLE SET ─────────────────────────────────────────────────────────────
  {
    entity: "credibleSet",
    sectionPath: "credibleSet/Locus2Gene",
    toolName: "get_l2g_widget",
    description:
      "Shows the Locus-to-Gene (L2G) heatmap for a credible set — gene prioritisation scores and SHAP feature contributions used to identify causal genes at GWAS loci.",
    inputParams: CREDIBLE_SET_INPUT,
    directFetch: true,
  },
  {
    entity: "credibleSet",
    sectionPath: "credibleSet/GWASColoc",
    toolName: "get_credible_set_gwas_coloc_widget",
    description:
      "Shows GWAS colocalisation results for a credible set — other GWAS traits and studies whose signals co-localise at this locus, with posterior probabilities.",
    inputParams: CREDIBLE_SET_INPUT,
    directFetch: true,
  },
  {
    entity: "credibleSet",
    sectionPath: "credibleSet/MolQTLColoc",
    toolName: "get_credible_set_mol_qtl_coloc_widget",
    description:
      "Shows molecular QTL colocalisation for a credible set — eQTL, pQTL and sQTL signals from GTEx and other resources that co-localise at this locus.",
    inputParams: CREDIBLE_SET_INPUT,
    directFetch: true,
  },
  {
    entity: "credibleSet",
    sectionPath: "credibleSet/Variants",
    toolName: "get_credible_set_variants_widget",
    description:
      "Shows the variants within a credible set — posterior inclusion probabilities, allele frequencies, and functional annotations for all tagged variants.",
    inputParams: CREDIBLE_SET_INPUT,
    directFetch: true,
  },
  {
    entity: "credibleSet",
    sectionPath: "credibleSet/EnhancerToGenePredictions",
    toolName: "get_credible_set_e2g_widget",
    description:
      "Shows enhancer-to-gene (E2G) predictions for a credible set — regulatory links between non-coding variants and target genes from Activity-by-Contact and other models.",
    inputParams: CREDIBLE_SET_INPUT,
    directFetch: true,
  },

  // ── STUDY ────────────────────────────────────────────────────────────────────
  {
    entity: "study",
    sectionPath: "study/GWASCredibleSets",
    toolName: "get_gwas_credible_sets_widget",
    description:
      "Shows GWAS credible sets for a study — Manhattan plot of fine-mapped loci with lead variants, p-values, fine-mapping confidence, and top L2G gene scores.",
    inputParams: STUDY_INPUT,
    directFetch: true,
  },
  {
    entity: "study",
    sectionPath: "study/QTLCredibleSets",
    toolName: "get_study_qtl_credible_sets_widget",
    description:
      "Shows QTL credible sets for a molecular QTL study — fine-mapped loci with lead variants and associated gene targets.",
    inputParams: STUDY_INPUT,
    directFetch: true,
  },
  {
    entity: "study",
    sectionPath: "study/SharedTraitStudies",
    toolName: "get_shared_trait_studies_widget",
    description:
      "Shows other GWAS studies that share the same disease or phenotype associations as a given study, with sample sizes, cohorts, and publications.",
    inputParams: STUDY_INPUT,
    directFetch: true,
  },

  // ── VARIANT ──────────────────────────────────────────────────────────────────
  {
    entity: "variant",
    sectionPath: "variant/VariantEffect",
    toolName: "get_variant_effect_widget",
    description:
      "Shows in-silico predictor scores for a variant — AlphaMissense, SIFT, LOFTEE, FoldX, GERP, VEP, and LoF curation scores as a normalised dot plot from likely benign to likely deleterious.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
  {
    entity: "variant",
    sectionPath: "variant/EVA",
    toolName: "get_variant_eva_widget",
    description:
      "Shows ClinVar/EVA clinical evidence for a variant — variant classifications, conditions, review status, and supporting evidence from clinical databases.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
  {
    entity: "variant",
    sectionPath: "variant/EnhancerToGenePredictions",
    toolName: "get_variant_e2g_widget",
    description:
      "Shows enhancer-to-gene (E2G) predictions for a variant — regulatory links to target genes from Activity-by-Contact and other functional genomics models.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
  {
    entity: "variant",
    sectionPath: "variant/GWASCredibleSets",
    toolName: "get_variant_gwas_credible_sets_widget",
    description:
      "Shows GWAS credible sets containing a variant — fine-mapped loci across studies where this variant is included, with study traits and posterior probabilities.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
  {
    entity: "variant",
    sectionPath: "variant/Pharmacogenomics",
    toolName: "get_variant_pharmacogenomics_widget",
    description:
      "Shows pharmacogenomics annotations for a variant — drug-gene interactions and phenotype associations from PharmGKB and other resources.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
  {
    entity: "variant",
    sectionPath: "variant/QTLCredibleSets",
    toolName: "get_variant_qtl_credible_sets_widget",
    description:
      "Shows molecular QTL credible sets for a variant — eQTL, pQTL, and sQTL fine-mapped loci containing this variant across tissues and cell types.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
  {
    entity: "variant",
    sectionPath: "variant/UniProtVariants",
    toolName: "get_variant_uniprot_widget",
    description:
      "Shows UniProt protein variant annotations for a variant — functional consequence, pathogenicity classification, and protein domain context.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
  {
    entity: "variant",
    sectionPath: "variant/VariantEffectPredictor",
    toolName: "get_variant_vep_widget",
    description:
      "Shows Ensembl Variant Effect Predictor (VEP) annotations for a variant — transcript consequences, amino acid changes, and regulatory feature impacts across all overlapping genes.",
    inputParams: VARIANT_INPUT,
    directFetch: true,
  },
];
