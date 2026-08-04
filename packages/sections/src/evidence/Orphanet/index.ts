import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "orphanet";
export const definition = {
  id,
  name: "Orphanet",
  shortName: "ON",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.orphanetSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 