import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "crispr";
export const definition = {
  id,
  name: "Project Score",
  shortName: "PS",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.crisprSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 