import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "ot_crispr";
export const definition = {
  id,
  name: "Open Targets CRISPR",
  shortName: "OT",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.OtCrisprSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 