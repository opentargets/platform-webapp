import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "cancer_gene_census";
export const definition = {
  id,
  name: "Cancer Gene Census",
  shortName: "CC",
  hasData: (data: EvidenceData) => hasEvidence(data, "cancerGeneCensus", "cancerGeneCensusSummary"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 