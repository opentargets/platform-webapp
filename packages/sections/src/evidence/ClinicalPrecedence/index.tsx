import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "clinical_precedence";
export const definition = {
  id,
  name: "Clinical Precedence",
  shortName: "CP",
  category: ["Target-Disease", "Drug"],
  hasData: (data: EvidenceData) => (data.clinical_precedence?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 