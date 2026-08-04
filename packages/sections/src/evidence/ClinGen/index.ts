import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "clingen";
export const definition = {
  id,
  name: "ClinGen",
  shortName: "CG",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.clingenSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 