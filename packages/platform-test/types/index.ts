/**
 * Test configuration interface
 * Defines the structure of test data used across E2E tests
 */

export interface TestConfig {
  drug: {
    /** Drug with comprehensive data across all sections */
    primary: string;
    alternatives?: {
      withWarnings: string;
      withAdverseEvents: string;
      /** Small molecule with a ChEMBL structure image, cross references and child molecules */
      smallMolecule?: string;
      /** Salt form with a parent molecule and without pharmacogenetics */
      withParentMolecule?: string;
      /** Drug with more than one page of warnings and of adverse events */
      withManyWarnings?: string;
      /** Drug with several mechanisms of action, one of them with more than one target */
      withMultipleMechanisms?: string;
      /** Drug whose mechanism of action has no human target */
      withNonHumanTarget?: string;
      /** Drug with only the mechanisms of action and indications sections */
      sparse?: string;
    };
  };
  variant: {
    /** Variant with GWAS and general data */
    primary: string;
    /** Variant with molecular structure data */
    withMolecularStructure: string;
    /** Variant with pharmacogenomics data */
    withPharmacogenomics: string;
    /** Variant with QTL data */
    withQTL?: string;
    /** Variant with EVA/ClinVar data */
    withEVA?: string;
  };
  target?: {
    primary?: string;
    alternatives?: string[];
    /** Target with more than two pages of safety liabilities (drawers, effects, sources) */
    withSafetyLiabilities?: string;
    /** Target with more than one page of chemical probes (controls, low quality, N/A) */
    withChemicalProbes?: string;
    /** Target whose baseline expression is highly specific to a tissue and a cell type */
    withSpecificExpression?: string;
    /** Target with no drugs, no safety liabilities and no chemical probes (sections absent) */
    withoutDrugsSafetyOrProbes?: string;
    /** Target with several pages of pharmacogenetics rows (star alleles, genotypes, drawers) */
    withPharmacogenomics?: string;
    /** Target with more than one page of cancer hallmarks */
    withManyCancerHallmarks?: string;
    /** Non-coding target: no UniProt entry, description, hallmarks, mouse phenotypes or homologues */
    nonCoding?: string;
    /** Target with no literature and no molQTL credible sets (sections absent), and no synonyms */
    withoutLiteratureOrQtl?: string;
    /** Target flagged as a core essential gene by Cancer DepMap */
    coreEssential?: string;
    /** Target with a handful of publications (two pages of five) and a known earliest publication year */
    withFewPublications?: string;
    /** Target with pharmacogenetics rows both where it is and where it is not the direct drug target */
    withDirectTargetPharmacogenomics?: string;
    aotfDiseases?: string[];
  };
  disease: {
    primary: string;
    name?: string;
    alternatives?: string[];
    aotfGenes?: string[];
  };
  /** Target and disease pairs for the evidence page (/evidence/:ensgId/:efoId) */
  evidence?: {
    /** Pair with many evidence sections (BRAF, melanoma) */
    primary: { ensgId: string; efoId: string };
    /** Pair with genetic evidence (IL6R, myocardial infarction) */
    withGeneticEvidence: { ensgId: string; efoId: string };
    /** Existing target and disease with no evidence between them */
    withoutEvidence: { ensgId: string; efoId: string };
  };
  study: {
    gwas: {
      primary: string;
      alternatives?: string[];
    };
    qtl?: {
      primary?: string;
      alternatives?: string[];
    };
  };
  credibleSet?: {
    primary?: string;
    withGWASColoc?: string;
    withQTLColoc?: string;
    /** A molQTL credible set (no L2G predictions) */
    qtl?: string;
  };
} /**
 * CSV row structure from Google Sheet
 */

export interface CSVRow {
  "Testing Scenario": string;
  drug_page_primary: string;
  variant_primary: string;
  variant_with_pharmacogenetics: string;
  variant_with_qtl: string;
  target_primary: string;
  target_incomplete: string;
  target_aotf_diseases: string;
  disease_primary: string;
  disease_name: string;
  disease_alternatives: string;
  disease_aotf_genes: string;
  study_gwas: string;
  study_qtl: string;
  credible_set: string;
  credible_set_GWAS_coloc: string;
  credible_set_QTL_coloc: string;
}
