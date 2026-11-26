import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "gene2phenotype";
export const definition = {
  id,
  name: "Gene2Phenotype",
  shortName: "GP",
  hasData: (data: EvidenceData) => hasEvidence(data, "gene2Phenotype"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 