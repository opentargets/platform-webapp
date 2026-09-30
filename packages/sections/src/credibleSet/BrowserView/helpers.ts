import { chromosomeInfo } from "@ot/constants";

const MAX_REGION_WIDTH = 5_000_000;
const REGION_PADDING = 1_000_000;
const PAN_ZOOM_PADDING = 250_000;

type BrowserViewRegionArgs = {
  chromosome?: string;
  locusRows: any[];
  l2gRows: any[];
};

export function getBrowserViewRegion({ chromosome, locusRows, l2gRows }: BrowserViewRegionArgs) {
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
