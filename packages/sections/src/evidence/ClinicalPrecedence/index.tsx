import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "clinical_precedence";
export const definition = {
  id,
  name: "Clinical Precedence",
  shortName: "CP",
  hasData: (data: EvidenceData) => hasEvidence(data, "clinicalPrecedence", "clinical_precedence"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 