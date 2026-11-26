import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "gene_burden";
export const definition = {
  id,
  name: "Gene Burden",
  shortName: "GB",
  hasData: (data: EvidenceData) => hasEvidence(data, "geneBurden", "geneBurdenSummary"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 