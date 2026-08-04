import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "intogen";
export const definition = {
  id,
  name: "IntOGen",
  shortName: "IO",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.intOgen?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 