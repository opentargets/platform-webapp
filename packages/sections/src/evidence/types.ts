import type { EvidenceViews } from "@ot/constants";

type Count = { count: number } | null | undefined;

// `europePmc` is on the staging API but not yet in the generated types: regenerating them
// waits on the genomic region queries (platform-webapp#1156)
export type EvidenceView = Exclude<keyof EvidenceViews, "__typename"> | "europePmc";

export type EvidenceData = { [key: string]: Count } & {
  evidenceViews?: { [View in EvidenceView]?: Count } | null;
};

export interface EvidenceSectionData {
  [key: string]: EvidenceData;
}

// definition.hasData receives two shapes: the evidence profile query, whose summary
// fragments count each datasource under `evidenceViews`, and the widget's own Body query,
// which still pages `evidences` under its alias. The alias goes once the Body moves to
// its evidence view.
export const hasEvidence = (data: EvidenceData, view: EvidenceView, bodyAlias: string) =>
  (data.evidenceViews?.[view]?.count ?? data[bodyAlias]?.count ?? 0) > 0;
