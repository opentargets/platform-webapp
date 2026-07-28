import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "gene2phenotype";
export const definition = {
  id,
  name: "Gene2Phenotype",
  shortName: "GP",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.gene2Phenotype?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 