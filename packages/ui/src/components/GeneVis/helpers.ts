import { TextStyle } from "pixi.js";

export const BIOTYPE_DISPLAY_NAMES = {
  protein_coding: "Protein coding",
  processed_transcript: "Processed transcript",
  pseudogene: "Pseudogene",
  rna: "RNA",
  other: "Other",
};

export const BIOTYPE_ORDER = ["protein_coding", "rna", "pseudogene", "processed_transcript", "other"];
export const geneLabelStyle = new TextStyle({ align: "center", fill: "#000", fontSize: 10.5, fontWeight: "100", wordWrap: false });
export const L2G_LABEL_PADDING = 6;

export function getGeneLabelText(gene: any, score: number | undefined) {
  const leftArrow = gene.genomicLocation.strand === "NEGATIVE" ? "← " : "";
  const rightArrow = gene.genomicLocation.strand === "POSITIVE" ? " →" : "";
  const name = gene.approvedSymbol || gene.id;
  return score !== undefined ? `${leftArrow}${name}: ${score.toFixed(3)}${rightArrow}` : `${leftArrow}${name}${rightArrow}`;
}

export function groupTargetsByBiotype(targets) {
  return Object.groupBy(targets, gene => {
    const b = gene.biotype?.toLowerCase() ?? "other";
    if (b === "protein_coding") return "protein_coding";
    if (b === "processed_transcript") return "processed_transcript";
    if (b.includes("pseudogene")) return "pseudogene";
    if (b.includes("rna")) return "rna";
    return "other";
  });
}

export function getBiotypeConfig(biotype?: string) {
  if (biotype === "protein_coding") {
    return {
      pixelGapCenterToCenter: 95,
      detailRowHeight: 30,
    };
  }
  return {
    pixelGapCenterToCenter: 80,
    detailRowHeight: 20,
  };
}

export function getGeneTrackLayout({
  targets,
  geneToRow,
  labeledIds,
  detailRowHeight,
  biotype,
}: {
  targets: any[];
  geneToRow: Record<string, number>;
  labeledIds: Set<string>;
  detailRowHeight: number;
  biotype: string;
}) {
  const rowsWithLabels = new Set<number>();
  for (const gene of targets) {
    const row = geneToRow[gene.id];
    if (row !== undefined && labeledIds.has(gene.id)) {
      rowsWithLabels.add(row);
    }
  }

  const nRows = Math.max(...Object.values(geneToRow).map((v: unknown) => Number(v))) + 1;
  const rowHeightMap: number[] = [];
  const rowYOffsets: number[] = [];
  const trackVerticalPadding = 2;
  let currentYOffset = trackVerticalPadding;
  const tallHeight = detailRowHeight;
  const shortHeight = Math.max(16, tallHeight / 2 + 2);
  const rowGap = 2;

  for (let r = 0; r < nRows; r++) {
    const rowHasLabels = rowsWithLabels.has(r);
    const rowHeight = rowHasLabels ? tallHeight : shortHeight;
    rowHeightMap[r] = rowHeight;
    rowYOffsets[r] = currentYOffset;
    currentYOffset += rowHeight + (r < nRows - 1 ? rowGap : 0);
  }

  const trackHeight = currentYOffset + trackVerticalPadding;
  return {
    rowHeightMap,
    rowYOffsets,
    trackHeight: Math.max(trackHeight, 20),
    paddingTop: biotype === "protein_coding" ? 10 : Math.max(6, (20 - trackHeight) / 2),
  };
}
