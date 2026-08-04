import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "uniprot_variants";
export const definition = {
  id,
  name: "UniProt variants",
  shortName: "UV",
  category: "Disease-Variant",
  hasData: (data: EvidenceData) => (data.uniprotVariantsSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 