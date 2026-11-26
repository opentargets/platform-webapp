/**
 * What each test entity must render.
 *
 * The app drops a section from the page when its query returns no data, and it drops it
 * just the same when the query fails. This manifest is what lets the tests tell "broken"
 * from "empty": for the IDs below, every listed section has to be on the page, and no
 * other section may be.
 *
 * When a test fails because a section is missing or a new one appeared:
 *   1. Open the page. If the section is there for a human, the test is wrong.
 *   2. If the section is gone, check the API for the query behind it. An error is a bug
 *      in the app or the API. An empty result means the data release changed: update
 *      this file, or pick an entity that still has the data.
 *
 * Section ids are the `data-testid` values without the "section-" prefix.
 * Recorded against data release 26.12.
 */
export const EXPECTED_SECTIONS: Record<string, readonly string[]> = {
  // Drug: trastuzumab
  CHEMBL1201585: [
    "mechanismsofaction",
    "indications",
    "drugwarnings",
    "pharmacogenetics",
    "adverseevents",
    "bibliography",
  ],

  // Drug: warfarin (small molecule)
  CHEMBL1464: [
    "mechanismsofaction",
    "indications",
    "drugwarnings",
    "pharmacogenetics",
    "adverseevents",
    "bibliography",
  ],

  // Drug: warfarin sodium (salt of warfarin, no pharmacogenetics)
  CHEMBL1200879: [
    "mechanismsofaction",
    "indications",
    "drugwarnings",
    "adverseevents",
    "bibliography",
  ],

  // Drug: rofecoxib (withdrawn)
  CHEMBL122: [
    "mechanismsofaction",
    "indications",
    "drugwarnings",
    "pharmacogenetics",
    "adverseevents",
    "bibliography",
  ],

  // Drug: imatinib (no warnings)
  CHEMBL941: ["mechanismsofaction", "indications", "pharmacogenetics", "adverseevents", "bibliography"],

  // Drug: amoxicillin (no warnings)
  CHEMBL1082: ["mechanismsofaction", "indications", "pharmacogenetics", "adverseevents", "bibliography"],

  // Drug: zanzalintinib fumarate (no warnings, pharmacogenetics, adverse events or literature)
  CHEMBL5314605: ["mechanismsofaction", "indications"],

  // Target: BRAF
  ENSG00000157764: [
    "drugs",
    "tractability",
    "safety",
    "qtl-credible-sets",
    "chemicalprobes",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "cancerhallmarks",
    "mousephenotypes",
    "compgenomics",
    "bibliography",
  ],

  // Target: BRCA2
  ENSG00000139618: [
    "tractability",
    "qtl-credible-sets",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "cancerhallmarks",
    "mousephenotypes",
    "compgenomics",
    "bibliography",
  ],

  // Target: ADRB2 (safety liabilities)
  ENSG00000169252: [
    "drugs",
    "tractability",
    "safety",
    "pharmacogenetics",
    "qtl-credible-sets",
    "chemicalprobes",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "mousephenotypes",
    "compgenomics",
    "bibliography",
  ],

  // Target: BRD4 (chemical probes)
  ENSG00000141867: [
    "drugs",
    "tractability",
    "safety",
    "qtl-credible-sets",
    "chemicalprobes",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "cancerhallmarks",
    "mousephenotypes",
    "compgenomics",
    "bibliography",
  ],

  // Target: ALB (tissue-specific baseline expression; no drugs, safety or probes)
  ENSG00000163631: [
    "tractability",
    "qtl-credible-sets",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "mousephenotypes",
    "compgenomics",
    "bibliography",
  ],

  // Target: EGFR (membrane protein; isoform-specific subcellular location; large tables)
  ENSG00000146648: [
    "drugs",
    "tractability",
    "safety",
    "pharmacogenetics",
    "qtl-credible-sets",
    "chemicalprobes",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "cancerhallmarks",
    "mousephenotypes",
    "compgenomics",
    "bibliography",
  ],

  // Target: OR4D5 (sparse data: one pathway, String interactions only, AlphaFold structure only)
  ENSG00000171014: [
    "tractability",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "compgenomics",
    "bibliography",
  ],

  // Target: MALAT1 (lncRNA: Gene Ontology terms but no protein, so no location, constraint, structure, interactions or pathways)
  ENSG00000251562: ["qtl-credible-sets", "baselineexpression", "geneontology", "bibliography"],

  // Target: HOTAIR (lncRNA without any protein annotation, Gene Ontology included)
  ENSG00000228630: ["qtl-credible-sets", "baselineexpression", "mousephenotypes", "bibliography"],

  // Target: CYP2C19 (pharmacogenetics; no drugs, no cancer hallmarks)
  ENSG00000165841: [
    "tractability",
    "safety",
    "pharmacogenetics",
    "qtl-credible-sets",
    "chemicalprobes",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "mousephenotypes",
    "compgenomics",
    "bibliography",
  ],

  // Target: MIR1302-2HG (lncRNA with no literature, credible sets, mouse phenotypes or homologues)
  ENSG00000243485: ["baselineexpression", "geneontology"],

  // Target: PLK1 (core essential gene; no pharmacogenetics, cancer hallmarks or mouse phenotypes)
  ENSG00000166851: [
    "drugs",
    "tractability",
    "safety",
    "qtl-credible-sets",
    "chemicalprobes",
    "baselineexpression",
    "depmapessentiality",
    "subcellularlocation",
    "geneontology",
    "geneticconstraint",
    "molecularstructure",
    "interactions",
    "pathways",
    "compgenomics",
    "bibliography",
  ],

  // Disease: myocardial infarction
  MONDO_0005068: ["ontology", "drugs", "gwasstudies", "bibliography"],

  // Disease: breast cancer
  MONDO_0007254: ["ontology", "drugs", "gwasstudies", "bibliography"],

  // Disease: Huntington disease (the only one of these with clinical signs and symptoms)
  MONDO_0007739: ["ontology", "drugs", "phenotypes", "gwasstudies", "bibliography"],

  // Disease: genetic, familial or congenital disease (OTAR therapeutic area: no drugs, GWAS,
  // synonyms or cross references)
  OTAR_0000018: ["ontology", "bibliography"],

  // Variant: intron variant overlapping IL6R
  "1_154453788_C_T": [
    "in-silico-predictors",
    "variant-effect-predictor",
    "gwas-credible-sets",
    "qtl-credible-sets",
  ],

  // Variant: APOE missense variant
  "19_44908822_C_T": [
    "in-silico-predictors",
    "molecular-structure",
    "variant-effect-predictor",
    "eva",
    "uniprot-variants",
    "gwas-credible-sets",
    "qtl-credible-sets",
    "enhancer-to-gene-predictions",
    "pharmacogenetics",
  ],

  // Variant: PON1 variant
  "7_95308134_T_C": [
    "in-silico-predictors",
    "molecular-structure",
    "variant-effect-predictor",
    "gwas-credible-sets",
    "qtl-credible-sets",
    "pharmacogenetics",
  ],

  // Variant: 12 base deletion in an intron of a lncRNA gene
  "1_916631_AGAGCCGGCCCT_A": [
    "in-silico-predictors",
    "variant-effect-predictor",
    "qtl-credible-sets",
    "enhancer-to-gene-predictions",
  ],

  // Study: GWAS
  GCST90475211: ["gwas-credible-sets", "shared-trait-studies"],

  // Study: GWAS, UK Biobank WGS, no harmonised summary statistics and no credible sets
  GCST90667795: ["shared-trait-studies"],

  // Study: GWAS, FinnGen (no publication, summary statistics without QC values)
  FINNGEN_R12_I9_MI_STRICT: ["gwas-credible-sets", "shared-trait-studies"],

  // Study: GWAS, UK Biobank with 0 cases and 0 controls
  GCST90668060: ["gwas-credible-sets", "shared-trait-studies"],

  // Study: GWAS, MVP multi-ancestry (four LD populations)
  GCST90480130: ["gwas-credible-sets", "shared-trait-studies"],

  // Study: GWAS, UK Biobank WGS with an analysis flag
  GCST90473536: ["gwas-credible-sets", "shared-trait-studies"],

  // Study: GWAS linked to two diseases
  GCST90479550: ["gwas-credible-sets", "shared-trait-studies"],

  // Study: pQTL
  UKB_PPP_EUR_LPA_P08519_OID30747_v1: ["qtl-credible-sets"],

  // Study: eQTL (GTEx v10), a single credible set
  qts000015_qtd000286_gtex_v10_ge_nerve_tibial_ensg00000169174: ["qtl-credible-sets"],

  // Credible set: GWAS, from GCST90475211
  a3ea67115f6db323b2eae6c1bf6cda7e: [
    "variants",
    "locus2gene",
    "enhancer-to-gene-predictions",
    "gwas-coloc",
    "molqtl-coloc",
  ],

  // Credible set: pQTL, from UKB_PPP_EUR_LPA_P08519_OID30747_v1
  "5848564f6c070538c3bfe980357d4785": ["variants", "enhancer-to-gene-predictions", "gwas-coloc"],
};

/** The sections an entity must render. Throws for an entity the manifest does not know. */
export function expectedSectionsFor(entityId: string): readonly string[] {
  const sections = EXPECTED_SECTIONS[entityId];
  if (!sections) {
    throw new Error(
      `fixtures/expectedSections.ts has no entry for "${entityId}". Record which sections it renders before testing it, so a missing section fails the test.`
    );
  }
  return sections;
}
