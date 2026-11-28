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
  CHEMBL941: [
    "mechanismsofaction",
    "indications",
    "pharmacogenetics",
    "adverseevents",
    "bibliography",
  ],

  // Drug: amoxicillin (no warnings)
  CHEMBL1082: [
    "mechanismsofaction",
    "indications",
    "pharmacogenetics",
    "adverseevents",
    "bibliography",
  ],

  // Drug: zanzalintinib fumarate (no warnings, pharmacogenetics, adverse events or literature)
  CHEMBL5314605: ["mechanismsofaction", "indications"],

  // Target: BRAF
  ENSG00000157764: [
    "targetgenomicregion",
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
    "targetgenomicregion",
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
    "targetgenomicregion",
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
    "targetgenomicregion",
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
    "targetgenomicregion",
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
    "targetgenomicregion",
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
    "targetgenomicregion",
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
  ENSG00000251562: [
    "targetgenomicregion",
    "qtl-credible-sets",
    "baselineexpression",
    "geneontology",
    "bibliography",
  ],

  // Target: HOTAIR (lncRNA without any protein annotation, Gene Ontology included)
  ENSG00000228630: [
    "targetgenomicregion",
    "qtl-credible-sets",
    "baselineexpression",
    "mousephenotypes",
    "bibliography",
  ],

  // Target: WDR5 (had a Target Enabling Package until 26.09; see e2e/pages/target/targetTep.spec.ts)
  ENSG00000196363: [
    "targetgenomicregion",
    "tractability",
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

  // Target: ATAD2 (had a Target Enabling Package until 26.09; see e2e/pages/target/targetTep.spec.ts)
  ENSG00000156802: [
    "targetgenomicregion",
    "tractability",
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

  // Target: CYP2C19 (pharmacogenetics; no drugs, no cancer hallmarks)
  ENSG00000165841: [
    "targetgenomicregion",
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
  ENSG00000243485: ["targetgenomicregion", "baselineexpression", "geneontology"],

  // Target: PLK1 (core essential gene; no pharmacogenetics, cancer hallmarks or mouse phenotypes)
  ENSG00000166851: [
    "targetgenomicregion",
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

  // Disease: Marfan syndrome (many pages of clinical signs and symptoms, onset and modifier terms; no drugs)
  MONDO_0007947: ["ontology", "phenotypes", "gwasstudies", "bibliography"],

  // Disease: juvenile Huntington disease (a leaf of the ontology: no children, no phenotypes, drugs or GWAS)
  MONDO_0016621: ["ontology", "bibliography"],

  // Disease: genetic, familial or congenital disease (OTAR therapeutic area: no drugs, GWAS,
  // synonyms or cross references)
  OTAR_0000018: ["ontology", "bibliography"],

  // Variant: intron variant overlapping IL6R
  "1_154453788_C_T": [
    "in-silico-predictors",
    "variantgenomicregion",
    "variant-effect-predictor",
    "gwas-credible-sets",
    "qtl-credible-sets",
  ],

  // Variant: APOE missense variant
  "19_44908822_C_T": [
    "in-silico-predictors",
    "molecular-structure",
    "variantgenomicregion",
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
    "variantgenomicregion",
    "variant-effect-predictor",
    "gwas-credible-sets",
    "qtl-credible-sets",
    "pharmacogenetics",
  ],

  // Variant: 12 base deletion in an intron of a lncRNA gene
  "1_916631_AGAGCCGGCCCT_A": [
    "in-silico-predictors",
    "variantgenomicregion",
    "variant-effect-predictor",
    "qtl-credible-sets",
    "enhancer-to-gene-predictions",
  ],

  // Evidence: BRAF in melanoma
  "ENSG00000157764/MONDO_0005105": [
    "eva",
    "cancer-gene-census",
    "intogen",
    "eva-somatic",
    "clinical-precedence",
    "crispr",
    "cancer-biomarkers",
    "europe-pmc",
  ],

  // Evidence: IL6R in myocardial infarction
  "ENSG00000160712/MONDO_0005068": ["gwas-credible-sets", "clinical-precedence", "europe-pmc"],

  // Evidence: BRAF in myocardial infarction (only five text-mined Europe PMC rows)
  "ENSG00000157764/MONDO_0005068": ["europe-pmc"],

  // Evidence: BRAF in a disease with a single clinical precedence row and two Europe PMC rows
  "ENSG00000157764/MONDO_0005147": ["clinical-precedence", "europe-pmc"],

  // Evidence: PCSK9 in LDL cholesterol measurement (gene burden, 130 rows; GWAS credible sets, 600+ rows)
  "ENSG00000169174/EFO_0004611": ["gene-burden", "gwas-credible-sets"],

  // Evidence: LDLR in familial hypercholesterolemia 1 (ClinVar, thousands of rows)
  "ENSG00000130164/MONDO_0007750": [
    "clingen",
    "europe-pmc",
    "eva",
    "eva-somatic",
    "genomics-england",
    "impc",
    "uniprot-literature",
    "uniprot-variants",
  ],

  // Evidence: MIR1302-2HG in melanoma (both exist, no evidence between them)
  // MECP2, neurodevelopmental disorder: every curated genetic source, several rows each
  "ENSG00000169057/MONDO_0700092": [
    "clingen",
    "europe-pmc",
    "eva",
    "gene2phenotype",
    "genomics-england",
    "impc",
    "orphanet",
    "reactome",
    "uniprot-literature",
    "uniprot-variants",
  ],

  // MECP2, syndromic X-linked intellectual disability Lubs type: only Genomics England, Gene2Phenotype and UniProt literature
  "ENSG00000169057/MONDO_0010283": [
    "europe-pmc",
    "eva",
    "gene2phenotype",
    "genomics-england",
    "uniprot-literature",
  ],

  // NF1, neurofibromatosis type 1: every curated genetic source, many Genomics England and UniProt variant rows
  "ENSG00000196712/MONDO_0018975": [
    "clingen",
    "europe-pmc",
    "eva",
    "eva-somatic",
    "gene2phenotype",
    "genomics-england",
    "orphanet",
    "uniprot-literature",
    "uniprot-variants",
  ],

  // CFTR, cystic fibrosis: curated sources except Gene2Phenotype
  "ENSG00000001626/MONDO_0009061": [
    "clingen",
    "clinical-precedence",
    "europe-pmc",
    "eva",
    "gene-burden",
    "genomics-england",
    "gwas-credible-sets",
    "impc",
    "orphanet",
    "reactome",
    "uniprot-literature",
    "uniprot-variants",
  ],

  "ENSG00000243485/MONDO_0005105": [],

  // Evidence: KIF1A in neurodegenerative disease (17 CRISPR screens, 4 Expression Atlas experiments)
  "ENSG00000130294/MONDO_0005559": [
    "crispr-screen",
    "europe-pmc",
    "eva",
    "expression-atlas",
    "genomics-england",
    "orphanet",
    "uniprot-literature",
    "uniprot-variants",
  ],

  // Evidence: CHRM1 in Parkinson disease (one CRISPR screen)
  "ENSG00000168539/MONDO_0005180": ["clinical-precedence", "crispr-screen", "europe-pmc"],

  // Evidence: FGFR3 in cancer or benign tumor (Reactome 22 rows, Expression Atlas 22, IMPC 134)
  "ENSG00000068078/MONDO_0045024": [
    "cancer-biomarkers",
    "cancer-gene-census",
    "clinical-precedence",
    "crispr",
    "europe-pmc",
    "eva",
    "eva-somatic",
    "expression-atlas",
    "genomics-england",
    "gwas-credible-sets",
    "impc",
    "intogen",
    "reactome",
    "uniprot-literature",
    "uniprot-variants",
  ],

  // Evidence: CTNNB1 in cancer or benign tumor (Reactome 5 rows, Expression Atlas 5, IMPC 11)
  "ENSG00000168036/MONDO_0045024": ["expression-atlas", "impc", "reactome"],

  // Evidence: HRAS in cancer or benign tumor (a single Expression Atlas experiment, 29 Reactome rows)
  "ENSG00000174775/MONDO_0045024": ["expression-atlas", "reactome"],

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
    "crediblesetgenomicregion",
    "variants",
    "enhancer-to-gene-predictions",
    "gwas-coloc",
    "locus2gene",
    "molqtl-coloc",
  ],

  // Credible set: pQTL, from UKB_PPP_EUR_LPA_P08519_OID30747_v1
  "5848564f6c070538c3bfe980357d4785": [
    "crediblesetgenomicregion",
    "variants",
    "enhancer-to-gene-predictions",
    "gwas-coloc",
  ],
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
