import { lazy } from "react";
import { dataTypesMap, isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "cancer_biomarkers";
export const definition = {
  id,
  name: "Cancer Biomarkers",
  shortName: "CB",
  category: ["Target-Disease", "Drug"],
  hasData: (data: EvidenceData) => (data.cancerBiomarkersSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
  dataType: dataTypesMap.affected_pathway,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 