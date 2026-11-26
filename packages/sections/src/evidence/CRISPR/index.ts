import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "crispr";
export const definition = {
  id,
  name: "Project Score",
  shortName: "PS",
  hasData: (data: EvidenceData) => hasEvidence(data, "crispr", "crisprSummary"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 