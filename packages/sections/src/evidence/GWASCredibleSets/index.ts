import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "gwas_credible_sets";
export const definition = {
  id,
  name: "GWAS associations",
  shortName: "GW",
  category: "Disease-Variant",
  hasData: (data: EvidenceData) => (data.gwasCredibleSets?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 