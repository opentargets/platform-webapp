import { chromosomeInfo } from "@ot/constants";
import type { GeneVisModel } from "ui";

const OUTER_REGION_WIDTH = 180_000;
const INITIAL_ZOOM_WIDTH = 60_000;

function getBoundedRange(center: number, width: number, minimum: number, maximum: number): [number, number] {
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

export function getVariantGenomicRegion(chromosome?: string, position?: number) {
  const chromosomeLength = chromosomeInfo.find(item => item.chromosome === chromosome)?.length;
  if (!chromosome || !chromosomeLength || !Number.isFinite(position)) return undefined;

  const [start, end] = getBoundedRange(position, OUTER_REGION_WIDTH, 0, chromosomeLength);
  const initialZoom = getBoundedRange(position, INITIAL_ZOOM_WIDTH, start, end);

  return {
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

export function toGeneVisModel(variant: any, region: any): GeneVisModel {
  return {
    genes: region?.targets?.rows ?? [],
    referencePosition: variant.position,
  };
}
