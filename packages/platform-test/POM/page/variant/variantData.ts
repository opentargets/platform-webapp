/**
 * Variants used by the variant shell tests, with what identifies each one. Allele
 * frequencies, cross references and descriptions are checked as invariants; only what
 * identifies the variant is exact.
 */
export type VariantFacts = {
  id: string;
  chromosome: string;
  position: string;
  referenceAllele: string;
  alternateAllele: string;
  /** What the page header shows as the title. */
  title: string;
  descriptionStart: string;
  consequence: string;
  consequenceId: string;
  /** The cross references the header must link, by label. */
  crossReferences: Record<string, string[]>;
};

export const VARIANTS = {
  intron: {
    id: "1_154453788_C_T",
    chromosome: "chr1",
    position: "154453788",
    referenceAllele: "C",
    alternateAllele: "T",
    title: "1_154453788_C_T",
    descriptionStart: "Intron variant overlapping with IL6R",
    consequence: "intron variant",
    consequenceId: "0001627",
    crossReferences: { Ensembl: ["rs4129267"], gnomAD: ["1-154453788-C-T"] },
  },
  missense: {
    id: "19_44908822_C_T",
    chromosome: "chr19",
    position: "44908822",
    referenceAllele: "C",
    alternateAllele: "T",
    title: "19_44908822_C_T",
    descriptionStart: "Missense variant overlapping with APOE",
    consequence: "missense variant",
    consequenceId: "0001583",
    crossReferences: {
      Ensembl: ["rs7412"],
      ClinVar: ["VCV000441266", "VCV000441265", "VCV000441262", "VCV000017848"],
      ProtVar: ["19_44908822_C_T"],
      gnomAD: ["19-44908822-C-T"],
    },
  },
  pharmacogenomic: {
    id: "7_95308134_T_C",
    chromosome: "chr7",
    position: "95308134",
    referenceAllele: "T",
    alternateAllele: "C",
    title: "7_95308134_T_C",
    descriptionStart: "Missense variant overlapping with PON1",
    consequence: "missense variant",
    consequenceId: "0001583",
    crossReferences: {
      Ensembl: ["rs662"],
      ClinVar: ["VCV000013735"],
      ProtVar: ["7_95308134_T_C"],
      OMIM: ["168820#0001"],
      gnomAD: ["7-95308134-T-C"],
    },
  },
  /** A 35 base insertion: the title shows INS and the alternate allele is truncated. */
  longInsertion: {
    id: "2_148775650_T_TTTAAATAAAATTAAATAAAATTAAATTTAATTTAA",
    chromosome: "chr2",
    position: "148775650",
    referenceAllele: "T",
    alternateAllele: "TTTAAATAAAATTAAATAAAATTAAATTTAATTTAA",
    title: "2_148775650_T_INS",
    descriptionStart: "Intron variant overlapping with EPC2",
    consequence: "intron variant",
    consequenceId: "0001627",
    crossReferences: {
      Ensembl: ["rs59975774"],
      gnomAD: ["2-148775650-T-TTTAAATAAAATTAAATAAAATTAAATTTAATTTAA"],
    },
  },
  /** A 12 base deletion: the title shows DEL and the reference allele is short enough to show whole. */
  longDeletion: {
    id: "1_916631_AGAGCCGGCCCT_A",
    chromosome: "chr1",
    position: "916631",
    referenceAllele: "AGAGCCGGCCCT",
    alternateAllele: "A",
    title: "1_916631_DEL_A",
    descriptionStart: "Intron variant overlapping with ENSG00000272438",
    consequence: "intron variant",
    consequenceId: "0001627",
    crossReferences: { Ensembl: ["rs200313743"], gnomAD: ["1-916631-AGAGCCGGCCCT-A"] },
  },
} as const satisfies Record<string, VariantFacts>;

/** Population labels of the allele frequency plot, in the order it shows them. */
export const POPULATIONS = [
  "African/African-American",
  "American Admixed/Latino",
  "Amish",
  "Ashkenazi Jewish",
  "East Asian",
  "Finnish",
  "Middle Eastern",
  "Non-Finnish European",
  "South Asian",
  "Other",
] as const;

/** Where each cross reference label links to. */
export const CROSS_REFERENCE_URL: Record<string, (id: string, v: VariantFacts) => string> = {
  Ensembl: (id) => `https://www.ensembl.org/Homo_sapiens/Variation/Explore?v=${id}`,
  gnomAD: (id) => `https://gnomad.broadinstitute.org/variant/${id}?dataset=gnomad_r4`,
  ProtVar: (_id, v) =>
    `https://www.ebi.ac.uk/ProtVar/query?chromosome=${v.chromosome}&genomic_position=${v.position}&reference_allele=${v.referenceAllele}&alternative_allele=${v.alternateAllele}`,
  ClinVar: (id) => `https://www.ncbi.nlm.nih.gov/clinvar/variation/${id}`,
  OMIM: (id) => `https://www.omim.org/entry/${id}`,
};
