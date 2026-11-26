import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "genomics_england";
export const definition = {
  id,
  name: "GEL PanelApp",
  shortName: "GE",
  hasData: (data: EvidenceData) => hasEvidence(data, "genomicsEnglandPanelApp", "genomicsEngland"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 