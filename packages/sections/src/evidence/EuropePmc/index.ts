import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "europe_pmc";
export const definition = {
  id,
  name: "Europe PMC",
  shortName: "EP",
  category: "Literature",
  hasData: (data: EvidenceData) => (data.europePmc?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 