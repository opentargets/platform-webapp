import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "eva";
export const definition = {
  id,
  name: "ClinVar",
  shortName: "CV",
  hasData: (data: EvidenceData) => hasEvidence(data, "eva", "eva"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 