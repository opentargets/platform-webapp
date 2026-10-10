import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import type { SectionExportAdapter } from "ui";
import { EvidenceData } from "../types";

const id = "europe_pmc";
export const definition = {
  id,
  name: "Europe PMC",
  shortName: "EP",
  hasData: (data: EvidenceData) => (data.europePmc?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
const isObject = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * One reference per Europe PMC evidence row in the captured result. `literature[0]`
 * is a PMID for MED sources; other ids (PMC, patents) are kept as Europe PMC URLs.
 * Titles/authors are looked up from Europe PMC at export time.
 */
export const exportAdapter: SectionExportAdapter = {
  references: (data) => {
    const rows = isObject(data) ? data.disease?.europePmc?.rows : undefined;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => (Array.isArray(row?.literature) ? String(row.literature[0] ?? "") : ""))
      .filter(Boolean)
      .map((litId) =>
        /^\d+$/.test(litId)
          ? { id: `pmid:${litId}`, pmid: litId, title: "" }
          : {
              id: `url:${litId}`,
              url: `https://europepmc.org/search?query=${encodeURIComponent(litId)}`,
              title: litId,
            }
      );
  },
};
