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
  }
): PackResult {
  const {
    pixelGap = 0,
    pixelGapCenterToCenter = 0,
    bpPerPixel = 1,
    previousLayout = {},
    priorityIds = [],
    labeledIds = []
  } = options;
  const prioritySet = new Set(priorityIds);
  const labeledSet = new Set(labeledIds);

  const gapBp = pixelGap * bpPerPixel;
  const centerGapBp = pixelGapCenterToCenter * bpPerPixel;

  const annotated = intervals.map((d, i) => ({
    ...d,
    _index: i,
    _start: d.target.genomicLocation.start,
    _end: d.target.genomicLocation.end,
    _center: (d.target.genomicLocation.start + d.target.genomicLocation.end) / 2,
    _preferredRow: previousLayout[d.target.id],
    _isPriority: prioritySet.has(d.target.id),
    _hasLabel: labeledSet.has(d.target.id)
  }));

  const idToRow: PackResult = {};

  // Track all intervals placed in each row for gap detection
  type PlacedInterval = { start: number; end: number; center: number; hasLabel: boolean };
  const rowIntervals: PlacedInterval[][] = [];

  // Helper to check center gap between two intervals
  const checkCenterGap = (
    hasLabel1: boolean, center1: number,
    hasLabel2: boolean, center2: number
  ): boolean => {
    if (!hasLabel1 && !hasLabel2) return true;
    return Math.abs(center2 - center1) >= centerGapBp;
  };

  // Helper to check if a gene fits in a row (in any available gap)
  const fitsInRow = (interval: typeof annotated[0], rowIdx: number): boolean => {
    const existing = rowIntervals[rowIdx];
    if (!existing || existing.length === 0) return true;

    const { _start: start, _end: end, _center: center, _hasLabel: hasLabel } = interval;

    // Check if fits before first interval
    if (end + gapBp <= existing[0].start) {
      const centerOK = checkCenterGap(hasLabel, center, existing[0].hasLabel, existing[0].center);
      if (centerOK) return true;
    }

    // Check gaps between existing intervals
    for (let i = 0; i < existing.length - 1; i++) {
      const left = existing[i];
      const right = existing[i + 1];

      // Must fit between left.end and right.start
      if (left.end + gapBp <= start && end + gapBp <= right.start) {
        // Must satisfy center gap with both neighbors
        const centerOK1 = checkCenterGap(left.hasLabel, left.center, hasLabel, center);
        const centerOK2 = checkCenterGap(hasLabel, center, right.hasLabel, right.center);
        if (centerOK1 && centerOK2) return true;
      }
    }

    // Check if fits after last interval
    const last = existing[existing.length - 1];
    if (last.end + gapBp <= start) {
      const centerOK = checkCenterGap(last.hasLabel, last.center, hasLabel, center);
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
      hasLabel: interval._hasLabel
    };

    // Insert in sorted position by start
    const idx = rowIntervals[rowIdx].findIndex(i => i.start > interval._start);
    if (idx === -1) {
      rowIntervals[rowIdx].push(newInterval);
    } else {
      rowIntervals[rowIdx].splice(idx, 0, newInterval);
    }
  };

  // PHASE 1: Pack only L2G (priority) genes
  const l2gGenes = annotated
    .filter(d => d._isPriority)
    .sort((a, b) => a._start - b._start || a._index - b._index);

  // Assign L2G genes to rows 0, 1, 2... in order
  for (let i = 0; i < l2gGenes.length; i++) {
    const gene = l2gGenes[i];
    const targetRow = i; // Row 0 for first L2G, row 1 for second, etc.

    // Try to place in target row
    if (fitsInRow(gene, targetRow)) {
      placeInRow(gene, targetRow);
    } else {
      // Find any row that fits, preferring earlier rows
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
  }

  // PHASE 2: Pack non-L2G genes into available gaps
  const nonL2gGenes = annotated
    .filter(d => !d._isPriority)
    .sort((a, b) => a._start - b._start || a._index - b._index);

  for (const gene of nonL2gGenes) {
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