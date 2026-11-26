import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "impc";
export const definition = {
  id,
  name: "IMPC",
  shortName: "IM",
  hasData: (data: EvidenceData) => hasEvidence(data, "impc"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 