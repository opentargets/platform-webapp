import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "crispr_screen";
export const definition = {
  id,
  name: "CRISPR Screens",
  shortName: "CS",
  hasData: (data: EvidenceData) => hasEvidence(data, "crisprScreen"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 