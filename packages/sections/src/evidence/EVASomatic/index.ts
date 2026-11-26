import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { type EvidenceData, hasEvidence } from "../types";

const id = "eva_somatic";
export const definition = {
  id,
  name: "EVA somatic",
  shortName: "ES",
  hasData: (data: EvidenceData) => hasEvidence(data, "evaSomatic", "eva_somatic"),
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 