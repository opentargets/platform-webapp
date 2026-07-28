import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "crispr_screen";
export const definition = {
  id,
  name: "CRISPR Screens",
  shortName: "CS",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.CrisprScreenSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 