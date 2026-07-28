import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "eva";
export const definition = {
  id,
  name: "ClinVar",
  shortName: "CV",
  category: ["Target-Disease", "Disease-Variant"],
  hasData: (data: EvidenceData) => (data.eva?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 