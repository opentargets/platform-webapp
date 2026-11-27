import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "orphanet";
export const definition = {
  id,
  name: "Orphanet",
  shortName: "ON",
  hasData: (data: EvidenceData) => hasEvidence(data, "orphanet", "orphanetSummary"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 