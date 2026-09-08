type GenomicLocation = {
  start: number;
  end: number;
  strand: number;
  chromosome: string;
};

type Target = {
  id: string;
  approvedSymbol: string;
  biotype: string;
  canonicalExons: any;
  genomicLocation: GenomicLocation;
};

type IntervalInput = {
  target: Target;
};

type PackResult = Record<string, number>; // id -> rowIndex

export function packIntervals(
  intervals: IntervalInput[],
  options: {
    pixelGap?: number;
    pixelGapCenterToCenter?: number;
    bpPerPixel?: number;
    previousLayout?: Record<string, number>; // for stability
    priorityIds?: string[]; // high priority gene IDs to place in earliest rows
    labeledIds?: string[]; // gene IDs that have labels - center gap only applies around these
    priorityPixelGapCenterToCenter?: number; // larger centre gap whenever either gene is high priority
    labelWidthPixelsById?: Record<string, number>; // measured label widths for exact footprint packing
  }
): PackResult {
  const {
    pixelGap = 0,
    pixelGapCenterToCenter = 0,
    bpPerPixel = 1,
    previousLayout = {},
    priorityIds = [],
    labeledIds = [],
    priorityPixelGapCenterToCenter = pixelGapCenterToCenter,
    labelWidthPixelsById = {},
  } = options;
  const prioritySet = new Set(priorityIds);
  const labeledSet = new Set(labeledIds);

  const gapBp = pixelGap * bpPerPixel;
  const centerGapBp = pixelGapCenterToCenter * bpPerPixel;
  const priorityCenterGapBp = priorityPixelGapCenterToCenter * bpPerPixel;

  const annotated = intervals.map((d, i) => {
    const exons = d.target.canonicalExons ?? [];
    const intronStart = exons.length > 0
      ? Math.min(...exons.map((exon: { start: number }) => exon.start))
      : d.target.genomicLocation.start;
    const intronEnd = exons.length > 0
      ? Math.max(...exons.map((exon: { end: number }) => exon.end))
      : d.target.genomicLocation.end;
    const center = (intronStart + intronEnd) / 2;
    const labelWidth = labelWidthPixelsById[d.target.id];
    const labelHalfWidth = labelWidth === undefined ? 0 : labelWidth * bpPerPixel / 2;

    return {
      ...d,
      _index: i,
      _start: Math.min(intronStart, center - labelHalfWidth),
      _end: Math.max(intronEnd, center + labelHalfWidth),
      _center: center,
      _preferredRow: previousLayout[d.target.id],
      _isPriority: prioritySet.has(d.target.id),
      _hasLabel: labeledSet.has(d.target.id),
      _hasMeasuredLabel: labelWidth !== undefined,
    };
  });

  const idToRow: PackResult = {};

  // Track all intervals placed in each row for gap detection
  type PlacedInterval = { start: number; end: number; center: number; hasLabel: boolean; isPriority: boolean; hasMeasuredLabel: boolean };
  const rowIntervals: PlacedInterval[][] = [];

  // Helper to check center gap between two intervals
  const checkCenterGap = (
    hasLabel1: boolean, center1: number, isPriority1: boolean,
    hasLabel2: boolean, center2: number, isPriority2: boolean,
    hasMeasuredLabel1: boolean, hasMeasuredLabel2: boolean,
  ): boolean => {
    if (hasMeasuredLabel1 || hasMeasuredLabel2) return true;
    if (!hasLabel1 && !hasLabel2) return true;
    const requiredGap = isPriority1 || isPriority2 ? priorityCenterGapBp : centerGapBp;
    return Math.abs(center2 - center1) >= requiredGap;
  };

  // Helper to check if a gene fits in a row (in any available gap)
  const fitsInRow = (interval: typeof annotated[0], rowIdx: number): boolean => {
    const existing = rowIntervals[rowIdx];
    if (!existing || existing.length === 0) return true;

    const { _start: start, _end: end, _center: center, _hasLabel: hasLabel } = interval;

    // Check if fits before first interval
    if (end + gapBp <= existing[0].start) {
      const centerOK = checkCenterGap(hasLabel, center, interval._isPriority, existing[0].hasLabel, existing[0].center, existing[0].isPriority, interval._hasMeasuredLabel, existing[0].hasMeasuredLabel);
      if (centerOK) return true;
    }

    // Check gaps between existing intervals
    for (let i = 0; i < existing.length - 1; i++) {
      const left = existing[i];
      const right = existing[i + 1];

      // Must fit between left.end and right.start
      if (left.end + gapBp <= start && end + gapBp <= right.start) {
        // Must satisfy center gap with both neighbors
        const centerOK1 = checkCenterGap(left.hasLabel, left.center, left.isPriority, hasLabel, center, interval._isPriority, left.hasMeasuredLabel, interval._hasMeasuredLabel);
        const centerOK2 = checkCenterGap(hasLabel, center, interval._isPriority, right.hasLabel, right.center, right.isPriority, interval._hasMeasuredLabel, right.hasMeasuredLabel);
        if (centerOK1 && centerOK2) return true;
      }
    }

    // Check if fits after last interval
    const last = existing[existing.length - 1];
    if (last.end + gapBp <= start) {
      const centerOK = checkCenterGap(last.hasLabel, last.center, last.isPriority, hasLabel, center, interval._isPriority, last.hasMeasuredLabel, interval._hasMeasuredLabel);
      if (centerOK) return true;
    }

    return false;
  };

  // Helper to place an interval in a row (maintains sorted order by start position)
  const placeInRow = (interval: typeof annotated[0], rowIdx: number): void => {
    idToRow[interval.target.id] = rowIdx;
    if (!rowIntervals[rowIdx]) rowIntervals[rowIdx] = [];

    const newInterval = {
      start: interval._start,
      end: interval._end,
      center: interval._center,
      hasLabel: interval._hasLabel,
      isPriority: interval._isPriority,
      hasMeasuredLabel: interval._hasMeasuredLabel
    };

    // Insert in sorted position by start
    const idx = rowIntervals[rowIdx].findIndex(i => i.start > interval._start);
    if (idx === -1) {
      rowIntervals[rowIdx].push(newInterval);
    } else {
      rowIntervals[rowIdx].splice(idx, 0, newInterval);
    }
  };

  // Place priority genes first so they occupy the earliest viable rows, while
  // still allowing non-overlapping priority genes to share a row.
  const priorityGenes = annotated
    .filter(gene => gene._isPriority)
    .sort((a, b) => a._start - b._start || a._index - b._index);
  const otherGenes = annotated
    .filter(gene => !gene._isPriority)
    .sort((a, b) => a._start - b._start || a._index - b._index);

  for (const gene of [...priorityGenes, ...otherGenes]) {
    // Try each existing row
    let placed = false;
    for (let r = 0; r < rowIntervals.length; r++) {
      if (fitsInRow(gene, r)) {
        placeInRow(gene, r);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Create new row
      placeInRow(gene, rowIntervals.length);
    }
  }

  return idToRow;
}
