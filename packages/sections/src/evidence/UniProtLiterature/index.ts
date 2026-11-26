import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "uniprot_literature";
export const definition = {
  id,
  name: "UniProt literature",
  shortName: "UL",
  hasData: (data: EvidenceData) => hasEvidence(data, "uniprotLiterature", "uniprotLiteratureSummary"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 