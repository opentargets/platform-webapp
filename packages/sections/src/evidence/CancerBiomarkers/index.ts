import { lazy } from "react";
import { dataTypesMap, isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "cancer_biomarkers";
export const definition = {
  id,
  name: "Cancer Biomarkers",
  shortName: "CB",
  hasData: (data: EvidenceData) => hasEvidence(data, "cancerBiomarkers", "cancerBiomarkersSummary"),
  isPrivate: isPrivateEvidenceSection(id),
  dataType: dataTypesMap.somatic_mutation,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 