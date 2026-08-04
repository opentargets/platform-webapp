
export const infoStyle = {
  // background: "#f0f0f0",
  width: "100%",
  height: "100%",
  display: "flex",
  justifyContent: "end",
  alignItems: "center" ,
  textAlign: "right",
};

// Centralized gene color definitions
export const GENE_COLORS = {
  protein_coding: {
    main: "#2e5943",          // Dark green (L2G genes)
    nonL2G: "#bc3a19",        // Burnt orange (non-L2G protein coding)
    hoverBox: 0xC8E6C9,       // Pale green for L2G hover box
    nonL2GHoverBox: 0xF5C6B8, // Pale burnt orange for non-L2G hover box
  },
  processed_transcript: {
    main: "#ff7f0e",          // Orange
    hoverBox: 0xFFE0B2,       // Pale orange for hover box
  },
  pseudogene: {
    main: "#1f77b4",          // Blue
    hoverBox: 0xBBDEFB,       // Pale blue for hover box
  },
  rna: {
    main: "#9467bd",          // Purple
    hoverBox: 0xE1BEE7,       // Pale purple for hover box
  },
  other: {
    main: "#d62728",          // Red
    hoverBox: 0xFFCDD2,       // Pale red for hover box
  },
} as const;

// For specific RNA subtypes
export const RNA_SUBTYPE_COLORS: Record<string, number> = {
  lncRNA: 0xE1BEE7,
  miRNA: 0xE1BEE7,
  snRNA: 0xE1BEE7,
  snoRNA: 0xE1BEE7,
  rRNA: 0xE1BEE7,
  tRNA: 0xE1BEE7,
};

// Get hover box color by biotype and L2G status
export function getHoverBoxColor(biotype: string, isL2G: boolean = false): number {
  const biotypeLower = biotype.toLowerCase();
  
  if (biotypeLower === 'protein_coding') {
    return isL2G ? GENE_COLORS.protein_coding.hoverBox : GENE_COLORS.protein_coding.nonL2GHoverBox;
  }
  if (biotypeLower === 'pseudogene') {
    return GENE_COLORS.pseudogene.hoverBox;
  }
  if (biotypeLower.includes('rna') || RNA_SUBTYPE_COLORS[biotype]) {
    return GENE_COLORS.rna.hoverBox;
  }
  if (biotypeLower === 'processed_transcript') {
    return GENE_COLORS.processed_transcript.hoverBox;
  }
  
  return GENE_COLORS.other.hoverBox;
}

// from Ensembl: https://www.ensembl.org/info/genome/variation/prediction/predicted_data.html
export const PREDICTED_CONSEQUENCE_LOOKUP = {
  "SO:0001893": { color: "#ff0000", displayTerm: "Transcript ablation", impact: "HIGH", rank: 0 },
  "SO:0001574": { color: "#ff581a", displayTerm: "Splice acceptor variant", impact: "HIGH", rank: 1 },
  "SO:0001575": { color: "#ff581a", displayTerm: "Splice donor variant", impact: "HIGH", rank: 2 },
  "SO:0001587": { color: "#ff0000", displayTerm: "Stop gained", impact: "HIGH", rank: 3 },
  "SO:0001589": { color: "#9400d3", displayTerm: "Frameshift variant", impact: "HIGH", rank: 4 },
  "SO:0001578": { color: "#ff0000", displayTerm: "Stop lost", impact: "HIGH", rank: 5 },
  "SO:0002012": { color: "#ffd700", displayTerm: "Start lost", impact: "HIGH", rank: 6 },
  "SO:0001889": { color: "#ff69b4", displayTerm: "Transcript amplification", impact: "HIGH", rank: 7 },
  "SO:0001907": { color: "#7f7f7f", displayTerm: "Feature elongation", impact: "HIGH", rank: 8 },
  "SO:0001906": { color: "#7f7f7f", displayTerm: "Feature truncation", impact: "HIGH", rank: 9 },
  "SO:0001821": { color: "#ff69b4", displayTerm: "Inframe insertion", impact: "MODERATE", rank: 10 },
  "SO:0001822": { color: "#ff69b4", displayTerm: "Inframe deletion", impact: "MODERATE", rank: 11 },
  "SO:0001583": { color: "#ffd700", displayTerm: "Missense variant", impact: "MODERATE", rank: 12 },
  "SO:0001818": { color: "#ff0080", displayTerm: "Protein altering variant", impact: "MODERATE", rank: 13 },
  "SO:0001787": { color: "#ff7f50", displayTerm: "Splice donor 5th base variant", impact: "LOW", rank: 14 },
  "SO:0001630": { color: "#ff7f50", displayTerm: "Splice region variant", impact: "LOW", rank: 15 },
  "SO:0002170": { color: "#ff7f50", displayTerm: "Splice donor region variant", impact: "LOW", rank: 16 },
  "SO:0002169": { color: "#ff7f50", displayTerm: "Splice polypyrimidine tract variant", impact: "LOW", rank: 17 },
  "SO:0001626": { color: "#ff00ff", displayTerm: "Incomplete terminal codon variant", impact: "LOW", rank: 18 },
  "SO:0002019": { color: "#76ee00", displayTerm: "Start retained variant", impact: "LOW", rank: 19 },
  "SO:0001567": { color: "#76ee00", displayTerm: "Stop retained variant", impact: "LOW", rank: 20 },
  "SO:0001819": { color: "#76ee00", displayTerm: "Synonymous variant", impact: "LOW", rank: 21 },
  "SO:0001580": { color: "#458b00", displayTerm: "Coding sequence variant", impact: "MODIFIER", rank: 22 },
  "SO:0001620": { color: "#458b00", displayTerm: "Mature miRNA variant", impact: "MODIFIER", rank: 23 },
  "SO:0001623": { color: "#7ac5cd", displayTerm: "5 prime UTR variant", impact: "MODIFIER", rank: 24 },
  "SO:0001624": { color: "#7ac5cd", displayTerm: "3 prime UTR variant", impact: "MODIFIER", rank: 25 },
  "SO:0001792": { color: "#32cd32", displayTerm: "Non coding transcript exon variant", impact: "MODIFIER", rank: 26 },
  "SO:0001627": { color: "#02599c", displayTerm: "Intron variant", impact: "MODIFIER", rank: 27 },
  "SO:0001621": { color: "#ff4500", displayTerm: "NMD transcript variant", impact: "MODIFIER", rank: 28 },
  "SO:0001619": { color: "#32cd32", displayTerm: "Non coding transcript variant", impact: "MODIFIER", rank: 29 },
  "SO:0001968": { color: "#458b00", displayTerm: "Coding transcript variant", impact: "MODIFIER", rank: 30 },
  "SO:0001631": { color: "#a2b5cd", displayTerm: "Upstream gene variant", impact: "MODIFIER", rank: 31 },
  "SO:0001632": { color: "#a2b5cd", displayTerm: "Downstream gene variant", impact: "MODIFIER", rank: 32 },
  "SO:0001895": { color: "#a52a2a", displayTerm: "TFBS ablation", impact: "MODIFIER", rank: 33 },
  "SO:0001892": { color: "#a52a2a", displayTerm: "TFBS amplification", impact: "MODIFIER", rank: 34 },
  "SO:0001782": { color: "#a52a2a", displayTerm: "TF binding site variant", impact: "MODIFIER", rank: 35 },
  "SO:0001894": { color: "#a52a2a", displayTerm: "Regulatory region ablation", impact: "MODIFIER", rank: 36 },
  "SO:0001891": { color: "#a52a2a", displayTerm: "Regulatory region amplification", impact: "MODIFIER", rank: 37 },
  "SO:0001566": { color: "#a52a2a", displayTerm: "Regulatory region variant", impact: "MODIFIER", rank: 38 },
  "SO:0001628": { color: "#636363", displayTerm: "Intergenic variant", impact: "MODIFIER", rank: 39 },
  "SO:0001060": { color: "#636363", displayTerm: "Sequence variant", impact: "MODIFIER", rank: 40 }
};