import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "impc";
export const definition = {
  id,
  name: "IMPC",
  shortName: "IM",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.impc?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 