interface VariantConsequence {
  id: string;
  label: string;
  proteinCoding: boolean;
}

export const VARIANT_CONSEQUENCES: VariantConsequence[] = [
  { id: "SO:0001580", label: "coding_sequence_variant", proteinCoding: false },
  { id: "SO:0001632", label: "downstream_gene_variant", proteinCoding: false },
  { id: "SO:0001589", label: "frameshift_variant", proteinCoding: true },
  { id: "SO:0001626", label: "incomplete_terminal_codon_variant", proteinCoding: false },
  { id: "SO:0001822", label: "inframe_deletion", proteinCoding: true },
  { id: "SO:0001821", label: "inframe_insertion", proteinCoding: true },
  { id: "SO:0001060", label: "intergenic_variant", proteinCoding: false },
  { id: "SO:0001627", label: "intron_variant", proteinCoding: true },
  { id: "SO:0001620", label: "mature_miRNA_variant", proteinCoding: false },
  { id: "SO:0001583", label: "missense_variant", proteinCoding: true },
  { id: "SO:0001792", label: "non_coding_transcript_exon_variant", proteinCoding: false },
  { id: "SO:0001619", label: "non_coding_transcript_variant", proteinCoding: false },
  { id: "SO:0001818", label: "protein_altering_variant", proteinCoding: true },
  { id: "SO:0001574", label: "splice_acceptor_variant", proteinCoding: true },
  { id: "SO:0002170", label: "splice_donor_region_variant", proteinCoding: true },
  { id: "SO:0001575", label: "splice_donor_variant", proteinCoding: true },
  { id: "SO:0001787", label: "splice_donor_5th_base_variant", proteinCoding: true },
  { id: "SO:0002169", label: "splice_polypyrimidine_tract_variant", proteinCoding: false },
  { id: "SO:0001630", label: "splice_region_variant", proteinCoding: true },
  { id: "SO:0002012", label: "start_lost", proteinCoding: true },
  { id: "SO:0002019", label: "start_retained_variant", proteinCoding: true },
  { id: "SO:0001587", label: "stop_gained", proteinCoding: true },
  { id: "SO:0001578", label: "stop_lost", proteinCoding: true },
  { id: "SO:0001567", label: "stop_retained_variant", proteinCoding: true },
  { id: "SO:0001819", label: "synonymous_variant", proteinCoding: false },
  { id: "SO:0001893", label: "transcript_ablation", proteinCoding: false },
  { id: "SO:0001631", label: "upstream_gene_variant", proteinCoding: false },
  { id: "SO:0001624", label: "3_prime_UTR_variant", proteinCoding: false },
  { id: "SO:0001623", label: "5_prime_UTR_variant", proteinCoding: false },
];

// from Ensembl: https://www.ensembl.org/info/genome/variation/prediction/predicted_data.html
export const PREDICTED_CONSEQUENCE_LOOKUP = {
  "SO:0001893": { color: "#ff0000", displayTerm: "Transcript ablation", impact: "HIGH", rank: 0 },
  "SO:0001574": {
    color: "#ff581a",
    displayTerm: "Splice acceptor variant",
    impact: "HIGH",
    rank: 1,
  },
  "SO:0001575": { color: "#ff581a", displayTerm: "Splice donor variant", impact: "HIGH", rank: 2 },
  "SO:0001587": { color: "#ff0000", displayTerm: "Stop gained", impact: "HIGH", rank: 3 },
  "SO:0001589": { color: "#9400d3", displayTerm: "Frameshift variant", impact: "HIGH", rank: 4 },
  "SO:0001578": { color: "#ff0000", displayTerm: "Stop lost", impact: "HIGH", rank: 5 },
  "SO:0002012": { color: "#ffd700", displayTerm: "Start lost", impact: "HIGH", rank: 6 },
  "SO:0001889": {
    color: "#ff69b4",
    displayTerm: "Transcript amplification",
    impact: "HIGH",
    rank: 7,
  },
  "SO:0001907": { color: "#7f7f7f", displayTerm: "Feature elongation", impact: "HIGH", rank: 8 },
  "SO:0001906": { color: "#7f7f7f", displayTerm: "Feature truncation", impact: "HIGH", rank: 9 },
  "SO:0001821": {
    color: "#ff69b4",
    displayTerm: "Inframe insertion",
    impact: "MODERATE",
    rank: 10,
  },
  "SO:0001822": { color: "#ff69b4", displayTerm: "Inframe deletion", impact: "MODERATE", rank: 11 },
  "SO:0001583": { color: "#ffd700", displayTerm: "Missense variant", impact: "MODERATE", rank: 12 },
  "SO:0001818": {
    color: "#ff0080",
    displayTerm: "Protein altering variant",
    impact: "MODERATE",
    rank: 13,
  },
  "SO:0001787": {
    color: "#ff7f50",
    displayTerm: "Splice donor 5th base variant",
    impact: "LOW",
    rank: 14,
  },
  "SO:0001630": { color: "#ff7f50", displayTerm: "Splice region variant", impact: "LOW", rank: 15 },
  "SO:0002170": {
    color: "#ff7f50",
    displayTerm: "Splice donor region variant",
    impact: "LOW",
    rank: 16,
  },
  "SO:0002169": {
    color: "#ff7f50",
    displayTerm: "Splice polypyrimidine tract variant",
    impact: "LOW",
    rank: 17,
  },
  "SO:0001626": {
    color: "#ff00ff",
    displayTerm: "Incomplete terminal codon variant",
    impact: "LOW",
    rank: 18,
  },
  "SO:0002019": {
    color: "#76ee00",
    displayTerm: "Start retained variant",
    impact: "LOW",
    rank: 19,
  },
  "SO:0001567": { color: "#76ee00", displayTerm: "Stop retained variant", impact: "LOW", rank: 20 },
  "SO:0001819": { color: "#76ee00", displayTerm: "Synonymous variant", impact: "LOW", rank: 21 },
  "SO:0001580": {
    color: "#458b00",
    displayTerm: "Coding sequence variant",
    impact: "MODIFIER",
    rank: 22,
  },
  "SO:0001620": {
    color: "#458b00",
    displayTerm: "Mature miRNA variant",
    impact: "MODIFIER",
    rank: 23,
  },
  "SO:0001623": {
    color: "#7ac5cd",
    displayTerm: "5 prime UTR variant",
    impact: "MODIFIER",
    rank: 24,
  },
  "SO:0001624": {
    color: "#7ac5cd",
    displayTerm: "3 prime UTR variant",
    impact: "MODIFIER",
    rank: 25,
  },
  "SO:0001792": {
    color: "#32cd32",
    displayTerm: "Non coding transcript exon variant",
    impact: "MODIFIER",
    rank: 26,
  },
  "SO:0001627": { color: "#02599c", displayTerm: "Intron variant", impact: "MODIFIER", rank: 27 },
  "SO:0001621": {
    color: "#ff4500",
    displayTerm: "NMD transcript variant",
    impact: "MODIFIER",
    rank: 28,
  },
  "SO:0001619": {
    color: "#32cd32",
    displayTerm: "Non coding transcript variant",
    impact: "MODIFIER",
    rank: 29,
  },
  "SO:0001968": {
    color: "#458b00",
    displayTerm: "Coding transcript variant",
    impact: "MODIFIER",
    rank: 30,
  },
  "SO:0001631": {
    color: "#a2b5cd",
    displayTerm: "Upstream gene variant",
    impact: "MODIFIER",
    rank: 31,
  },
  "SO:0001632": {
    color: "#a2b5cd",
    displayTerm: "Downstream gene variant",
    impact: "MODIFIER",
    rank: 32,
  },
  "SO:0001895": { color: "#a52a2a", displayTerm: "TFBS ablation", impact: "MODIFIER", rank: 33 },
  "SO:0001892": {
    color: "#a52a2a",
    displayTerm: "TFBS amplification",
    impact: "MODIFIER",
    rank: 34,
  },
  "SO:0001782": {
    color: "#a52a2a",
    displayTerm: "TF binding site variant",
    impact: "MODIFIER",
    rank: 35,
  },
  "SO:0001894": {
    color: "#a52a2a",
    displayTerm: "Regulatory region ablation",
    impact: "MODIFIER",
    rank: 36,
  },
  "SO:0001891": {
    color: "#a52a2a",
    displayTerm: "Regulatory region amplification",
    impact: "MODIFIER",
    rank: 37,
  },
  "SO:0001566": {
    color: "#a52a2a",
    displayTerm: "Regulatory region variant",
    impact: "MODIFIER",
    rank: 38,
  },
  "SO:0001628": {
    color: "#636363",
    displayTerm: "Intergenic variant",
    impact: "MODIFIER",
    rank: 39,
  },
  "SO:0001060": { color: "#636363", displayTerm: "Sequence variant", impact: "MODIFIER", rank: 40 },
};

interface DataSource {
  datasourceId: string;
  datasourceNiceName: string;
}

export const DATASOURCES: DataSource[] = [
  { datasourceId: "eva", datasourceNiceName: "ClinVar" },
  { datasourceId: "eva_somatic", datasourceNiceName: "ClinVar-somatic" },
  { datasourceId: "gwas_credible_sets", datasourceNiceName: "GWAS credible sets" },
  { datasourceId: "mol_qtl", datasourceNiceName: "molQTL" },
  { datasourceId: "pharmgkb", datasourceNiceName: "pharmgkb" },
  { datasourceId: "uniprot_variants", datasourceNiceName: "UniProt Variants" },
];

interface VariantEffectMethod {
  methodName: string;
  prettyName: string;
  description: string;
  docsUrl: string;
}

const VARIANT_EFFECT_METHODS: Record<string, VariantEffectMethod> = {
  AlphaMissense: {
    methodName: "AlphaMissense",
    prettyName: "AlphaMissense",
    description:
      "Model that builds on AlphaFold2 to assess the effect for missense variants across the proteome.",
    docsUrl: "https://platform-docs.opentargets.org/variant#variant-effect",
  },
  LossOfFunctionCuration: {
    methodName: "LossOfFunctionCuration",
    prettyName: "LoF curation",
    description:
      "Curation of loss-of-function variants performed by an Open Targets project team (OTAR2075).",
    docsUrl: "https://platform-docs.opentargets.org/variant#variant-effect",
  },
  FoldX: {
    methodName: "FoldX",
    prettyName: "FoldX",
    description: "Tool that predicts the impact of mutations on protein stability and structure.",
    docsUrl: "https://platform-docs.opentargets.org/variant#variant-effect",
  },
  GERP: {
    methodName: "GERP",
    prettyName: "GERP",
    description:
      "Scores used to identify regions of the genome that are evolutionarily conserved and likely to be functionally important.",
    docsUrl: "https://platform-docs.opentargets.org/variant#variant-effect",
  },
  LOFTEE: {
    methodName: "LOFTEE",
    prettyName: "LOFTEE",
    description:
      "Tool used to identify and annotate high-confidence loss-of-function, focusing on variants that likely disrupt gene function.",
    docsUrl: "https://platform-docs.opentargets.org/variant#variant-effect",
  },
  SIFT: {
    methodName: "SIFT",
    prettyName: "SIFT",
    description: "Predicting whether an amino acid substitution affects protein function.",
    docsUrl: "https://platform-docs.opentargets.org/variant#variant-effect",
  },
  VEP: {
    methodName: "Ensembl VEP",
    prettyName: "Ensembl VEP",
    description:
      "Pathogenicity score derived from the most severe consequence term provided by Ensembl VEP.",
    docsUrl: "https://platform-docs.opentargets.org/variant#variant-effect",
  },
};

// For TypeScript type safety when accessing methods
type VariantEffectMethodKey = keyof typeof VARIANT_EFFECT_METHODS;

export { VARIANT_EFFECT_METHODS, type VariantEffectMethod, type VariantEffectMethodKey };
