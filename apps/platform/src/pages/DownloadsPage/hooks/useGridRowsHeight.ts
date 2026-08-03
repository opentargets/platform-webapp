import { useCallback, useEffect, useState } from 'react';

/**
 * Measures the pixel height spanning the first `rows` rows of a CSS grid's
 * direct children (row boundaries are found from each child's rendered
 * offset, since card heights aren't fixed - they grow with description/
 * category content). Re-measures via ResizeObserver, which fires whenever
 * the grid's own height changes - from a window resize (column count/wrap
 * changes), or from card content or count changing.
 *
 * The result is meant to be a stable height for a fixed number of rows, not
 * a "shrink to fit" measurement: if fewer than `rows` rows are currently
 * rendered (e.g. a filter narrows the grid down to one row), the missing
 * rows are extrapolated from the tallest known row's height plus the grid's
 * own row gap, so the height doesn't collapse as results change.
 *
 * Returns null until the container is mounted and has children to measure.
 */
export const useGridRowsHeight = (rows: number) => {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((node: HTMLDivElement | null) => setContainer(node), []);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!container) return undefined;

    const measure = () => {
      const children = Array.from(container.children) as HTMLElement[];
      if (!children.length) {
        setHeight(null);
        return;
      }

      const containerTop = container.getBoundingClientRect().top;
      const edges = children.map((child) => {
        const rect = child.getBoundingClientRect();
        return { top: Math.round(rect.top - containerTop), bottom: Math.round(rect.bottom - containerTop) };
      });

      // Group into rows by top offset, keeping each row's tallest bottom edge.
      const rowBottomByTop = new Map<number, number>();
      edges.forEach(({ top, bottom }) => {
        rowBottomByTop.set(top, Math.max(rowBottomByTop.get(top) ?? bottom, bottom));
      });
      const rowTops = Array.from(rowBottomByTop.keys()).sort((a, b) => a - b);

      if (rowTops.length >= rows) {
        // Bottom edge of the last included row's tallest card - not the top
        // of the next row, which would also pull in the row gap after it.
        setHeight(rowBottomByTop.get(rowTops[rows - 1])!);
        return;
      }

      // Fewer rows rendered than requested: extrapolate the missing ones
      // from the tallest known row, so the height stays fixed regardless of
      // how many rows of results are actually present.
      const rowHeights = rowTops.map((top) => rowBottomByTop.get(top)! - top);
      const tallestRowHeight = Math.max(...rowHeights);
      const rowGap = parseFloat(window.getComputedStyle(container).rowGap || '0') || 0;

      const knownRowsHeight = rowHeights.reduce((sum, h) => sum + h, 0);
      const missingRows = rows - rowHeights.length;
      setHeight(knownRowsHeight + tallestRowHeight * missingRows + rowGap * (rows - 1));
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [rows, container]);

  return { containerRef, height };
};
