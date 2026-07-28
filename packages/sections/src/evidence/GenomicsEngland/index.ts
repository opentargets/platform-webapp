import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "genomics_england";
export const definition = {
  id,
  name: "GEL PanelApp",
  shortName: "GE",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.genomicsEngland?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 