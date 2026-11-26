import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "expression_atlas";
export const definition = {
  id,
  name: "Expression Atlas",
  shortName: "EA",
  hasData: (data: EvidenceData) => hasEvidence(data, "expressionAtlas"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 