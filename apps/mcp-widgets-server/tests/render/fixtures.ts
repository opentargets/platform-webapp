/**
 * Entity IDs each widget is rendered with. Defaults follow the Platform e2e suite
 * (packages/platform-test/fixtures/testConfig.ts) so both suites exercise the same data;
 * per-tool overrides pick an entity that actually has data for that section, since a
 * section with no data renders nothing and can't be told apart from a broken one.
 */

const MELANOMA = "MONDO_0005105";

/** Default value per tool input parameter name */
export const DEFAULT_ARGS: Record<string, string> = {
  ensemblId: "ENSG00000157764", // BRAF
  efoId: "MONDO_0005068", // myocardial infarction
  chemblId: "CHEMBL3353410", // osimertinib
  variantId: "1_55039974_G_T", // PCSK9 missense
  studyId: "GCST90475211", // heart attack GWAS
  studyLocusId: "1aac7a781b1395adad7daa04e5d13970",
};

/** Per-tool overrides, merged over the defaults */
export const TOOL_ARGS: Record<string, Record<string, string>> = {
  // Evidence widgets: BRAF–melanoma, unless the datasource has no evidence for that pair
  ...Object.fromEntries(
    [
      "get_evidence_crispr_widget",
      "get_evidence_cancer_biomarkers_widget",
      "get_evidence_cancer_gene_census_widget",
      "get_evidence_clinical_precedence_widget",
      "get_evidence_eva_widget",
      "get_evidence_eva_somatic_widget",
      "get_evidence_europe_pmc_widget",
      "get_evidence_intogen_widget",
      "get_evidence_ot_crispr_widget",
      "get_evidence_ot_encore_widget",
      "get_evidence_ot_validation_widget",
    ].map((tool) => [tool, { efoId: MELANOMA }])
  ),
  ...Object.fromEntries(
    [
      "get_evidence_gene2phenotype_widget",
      "get_evidence_gene_burden_widget",
      "get_evidence_genomics_england_widget",
      "get_evidence_gwas_credible_sets_widget",
      "get_evidence_impc_widget",
      "get_evidence_uniprot_literature_widget",
    ].map((tool) => [tool, { ensemblId: "ENSG00000147889", efoId: MELANOMA }]) // CDKN2A
  ),
  get_evidence_clingen_widget: { ensemblId: "ENSG00000135446", efoId: MELANOMA }, // CDK4
  get_evidence_crispr_screen_widget: { ensemblId: "ENSG00000188906", efoId: "MONDO_0005180" }, // LRRK2–Parkinson
  get_evidence_expression_atlas_widget: { ensemblId: "ENSG00000187098", efoId: MELANOMA }, // MITF
  get_evidence_orphanet_widget: { ensemblId: "ENSG00000163930", efoId: MELANOMA }, // BAP1
  get_evidence_reactome_widget: { ensemblId: "ENSG00000132475", efoId: MELANOMA }, // H3-3B
  get_evidence_uniprot_variants_widget: { ensemblId: "ENSG00000129071", efoId: MELANOMA }, // MBD4

  get_disease_phenotypes_widget: { efoId: "MONDO_0009061" }, // cystic fibrosis
  get_drug_pharmacogenomics_widget: { chemblId: "CHEMBL1464" }, // warfarin
  get_drug_warnings_widget: { chemblId: "CHEMBL122" }, // rofecoxib, withdrawn
  get_target_pharmacogenomics_widget: { ensemblId: "ENSG00000138109" }, // CYP2C9
  get_molecular_structure_widget: { variantId: "19_44908822_C_T" }, // APOE missense
  get_study_qtl_credible_sets_widget: { studyId: "UKB_PPP_EUR_LPA_P08519_OID30747_v1" },
  get_variant_eva_widget: { variantId: "19_44908822_C_T" },
  get_variant_pharmacogenomics_widget: { variantId: "7_95308134_T_C" }, // PON1
  get_variant_qtl_credible_sets_widget: { variantId: "1_154453788_C_T" },
  get_variant_uniprot_widget: { variantId: "19_44908822_C_T" },
};

export function argsFor(toolName: string, paramNames: string[]): Record<string, string> {
  const merged = { ...DEFAULT_ARGS, ...TOOL_ARGS[toolName] };
  return Object.fromEntries(paramNames.map((name) => [name, merged[name]]));
}
