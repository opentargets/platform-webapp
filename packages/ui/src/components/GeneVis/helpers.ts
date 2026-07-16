
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