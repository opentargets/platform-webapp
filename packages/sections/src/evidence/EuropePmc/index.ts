import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "europe_pmc";
export const definition = {
  id,
  name: "Europe PMC",
  shortName: "EP",
  hasData: (data: EvidenceData) => hasEvidence(data, "europePmc"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 