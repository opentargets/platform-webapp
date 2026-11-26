import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "clingen";
export const definition = {
  id,
  name: "ClinGen",
  shortName: "CG",
  hasData: (data: EvidenceData) => hasEvidence(data, "clingen", "clingenSummary"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 