import { chromosomeInfo } from "@ot/constants";
import type { GeneVisModel } from "ui";

const MAX_REGION_WIDTH = 5_000_000;
const REGION_PADDING = 1_000_000;
const PAN_ZOOM_PADDING = 250_000;

export function toGeneVisModel(data: any): GeneVisModel {
  const l2gRows = data?.l2GPredictions?.rows ?? [];
  const l2gTargetIds = l2gRows.map((row: any) => row.target.id);

  return {
    genes: data?.region?.targets?.rows ?? [],
    referencePosition: data?.variant?.position,
    overviewVariants: (data?.locus?.rows ?? []).map((row: any) => row.variant),
    variantTrack: data?.locus ? {
      rows: data.locus.rows ?? [],
      emphasis: data.variant ? { variantId: data.variant.id, label: "Lead" } : undefined,
    } : undefined,
    genePresentation: {
      priorityIds: l2gTargetIds,
      highlights: l2gTargetIds.length > 0 ? [{
        targetIds: l2gTargetIds,
        geneColor: 0x138160,
        hoverBoxColor: 0xc8e6c9,
        labelBackgroundColor: 0xc8e6c9,
        labelPadding: 6,
        legend: "L2G score > 0.05",
      }] : [],
      scoreByGeneId: Object.fromEntries(l2gRows.map((row: any) => [row.target.id, row.score])),
    },
  };
}

type CredibleSetGenomicRegionArgs = {
  chromosome?: string;
  locusRows: any[];
  l2gRows: any[];
};

export function getCredibleSetGenomicRegion({
  chromosome,
  locusRows,
  l2gRows,
}: CredibleSetGenomicRegionArgs) {
  const chromosomeLength = chromosomeInfo.find(item => item.chromosome === chromosome)?.length;
  const locusPositions = locusRows
    .map(row => row.variant?.position)
    .filter((position): position is number => Number.isFinite(position));
  const l2GPositions = l2gRows.flatMap(row => {
    const genomicLocation = row.target?.genomicLocation;
    if (
      genomicLocation?.chromosome !== chromosome ||
      !Number.isFinite(genomicLocation.start) ||
      !Number.isFinite(genomicLocation.end)
    ) {
      return [];
    }
    return [genomicLocation.start, genomicLocation.end];
  });
  const positions = [...locusPositions, ...l2GPositions];
  const earliestPosition = positions.length > 0 ? Math.min(...positions) : undefined;
  const highestPosition = positions.length > 0 ? Math.max(...positions) : undefined;

  let start: number | undefined;
  let end: number | undefined;
  let initialZoom: [number, number] | undefined;

  if (chromosome && chromosomeLength && earliestPosition !== undefined && highestPosition !== undefined) {
    const regionWidth = Math.min(
      highestPosition - earliestPosition + REGION_PADDING,
      MAX_REGION_WIDTH
    );
    const center = Math.round((earliestPosition + highestPosition) / 2);
    start = Math.floor(center - regionWidth / 2);
    end = Math.ceil(center + regionWidth / 2);

    if (start < 0) {
      end -= start;
      start = 0;
    } else if (end > chromosomeLength) {
      const overflow = end - chromosomeLength;
      end = chromosomeLength;
      start -= overflow;
    }

    const zoomStart = start + PAN_ZOOM_PADDING;
    const zoomEnd = end - PAN_ZOOM_PADDING;
    initialZoom = zoomStart >= zoomEnd || zoomStart > earliestPosition || zoomEnd < highestPosition
      ? [start, end]
      : [zoomStart, zoomEnd];
  }

  const regionVariables = chromosome && start !== undefined && end !== undefined
    ? { chromosome: `chr${chromosome}`, positionStart: start, positionEnd: end }
    : undefined;

  return { start, end, initialZoom, regionVariables };
}
