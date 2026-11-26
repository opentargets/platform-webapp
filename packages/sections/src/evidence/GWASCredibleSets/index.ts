import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "gwas_credible_sets";
export const definition = {
  id,
  name: "GWAS associations",
  shortName: "GW",
  hasData: (data: EvidenceData) => hasEvidence(data, "gwasCredibleSets", "gwasCredibleSets"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 