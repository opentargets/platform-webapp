import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "encore";
export const definition = {
  id,
  name: "Open Targets ENCORE",
  shortName: "OT",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.otEncoreSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 