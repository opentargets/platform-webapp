import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "intogen";
export const definition = {
  id,
  name: "IntOGen",
  shortName: "IO",
  hasData: (data: EvidenceData) => hasEvidence(data, "intogen", "intOgen"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 