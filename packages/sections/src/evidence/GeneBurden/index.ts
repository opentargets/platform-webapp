import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "gene_burden";
export const definition = {
  id,
  name: "Gene Burden",
  shortName: "GB",
  category: ["Target-Disease", "Disease-Variant"],
  hasData: (data: EvidenceData) => (data.geneBurdenSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 