import { ReportBlock } from "../../../types/report";

/**
 * Position-derived number for a numbered block kind: blocks of that kind up to
 * and including this one. Never stored, so it follows reorders/inserts/removals.
 */
const numberAmong = (blocks: ReportBlock[], reportSectionId: string, kind: ReportBlock["kind"]): number => {
  let n = 0;
  for (const block of blocks) {
    if (block.kind === kind) n += 1;
    if (block.reportSectionId === reportSectionId) return n;
  }
  return n;
};

export const figureNumber = (blocks: ReportBlock[], reportSectionId: string): number =>
  numberAmong(blocks, reportSectionId, "image");

export const figureLabel = (blocks: ReportBlock[], reportSectionId: string): string =>
  `Figure ${figureNumber(blocks, reportSectionId)}`;

export const tableNumber = (blocks: ReportBlock[], reportSectionId: string): number =>
  numberAmong(blocks, reportSectionId, "table");

export const tableLabel = (blocks: ReportBlock[], reportSectionId: string): string =>
  `Table ${tableNumber(blocks, reportSectionId)}`;
