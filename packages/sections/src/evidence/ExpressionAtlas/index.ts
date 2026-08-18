import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "expression_atlas";
export const definition = {
  id,
  name: "Expression Atlas",
  shortName: "EA",
  category: "Target-Disease",
  hasData: (data: EvidenceData) => (data.expressionAtlasSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 