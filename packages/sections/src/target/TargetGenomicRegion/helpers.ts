import { chromosomeInfo } from "@ot/constants";
import type { GeneVisModel } from "ui";

const MAX_WIDTH = 5_000_000;
const MIN_ZOOM_WIDTH = 250_000;
const ZOOM_PADDING = 50_000;

function getBoundedRange(
  center: number,
  width: number,
  minimum: number,
  maximum: number
): [number, number] {
  const boundedWidth = Math.min(width, maximum - minimum);
  let start = Math.floor(center - boundedWidth / 2);
  let end = start + boundedWidth;

  if (start < minimum) {
    end += minimum - start;
    start = minimum;
  }
  if (end > maximum) {
    start -= end - maximum;
    end = maximum;
  }

  return [Math.max(minimum, start), end];
}

export function getTargetGenomicRegion(canonicalTranscript?: {
  chromosome?: string;
  start?: number;
  end?: number;
}) {
  const { chromosome, start: transcriptStart, end: transcriptEnd } = canonicalTranscript ?? {};
  const chromosomeLength = chromosomeInfo.find(item => item.chromosome === chromosome)?.length;
  if (
    !chromosome ||
    !chromosomeLength ||
    typeof transcriptStart !== "number" ||
    typeof transcriptEnd !== "number" ||
    !Number.isFinite(transcriptStart) ||
    !Number.isFinite(transcriptEnd)
  ) return undefined;

  const transcriptLength = transcriptEnd - transcriptStart;
  const center = Math.round((transcriptStart + transcriptEnd) / 2);
  const zoomWidth = Math.min(Math.max(transcriptLength + ZOOM_PADDING, MIN_ZOOM_WIDTH), MAX_WIDTH);
  const regionWidth = Math.min(zoomWidth * 2, MAX_WIDTH);
  const [start, end] = getBoundedRange(center, regionWidth, 0, chromosomeLength);
  const initialZoom = getBoundedRange(center, zoomWidth, start, end);

  return {
    chromosome,
    center,
    start,
    end,
    initialZoom,
    regionVariables: {
      chromosome: `chr${chromosome}`,
      positionStart: start,
      positionEnd: end,
    },
  };
}

export function toGeneVisModel(
  targetId: string,
  region: any,
  referencePosition: number
): GeneVisModel {
  return {
    genes: region?.targets?.rows ?? [],
    referencePosition,
    genePresentation: {
      priorityIds: [targetId],
      highlights: [{
        targetIds: [targetId],
        geneColor: 0x138160,
        hoverBoxColor: 0xc8e6c9,
        labelBackgroundColor: 0xc8e6c9,
        labelPadding: 6,
      }],
    },
  };
}
