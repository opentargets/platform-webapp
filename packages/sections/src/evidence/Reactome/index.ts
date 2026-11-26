import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "reactome";
export const definition = {
  id,
  name: "Reactome",
  shortName: "RE",
  hasData: (data: EvidenceData) => hasEvidence(data, "reactome"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 