import { lazy } from "react";
import { isPrivateEvidenceSection } from "@ot/constants";
import { EvidenceData } from "../types";

const id = "uniprot_literature";
export const definition = {
  id,
  name: "UniProt literature",
  shortName: "UL",
  category: ["Target-Disease", "Literature"],
  hasData: (data: EvidenceData) => (data.uniprotLiteratureSummary?.count || 0) > 0,
  isPrivate: isPrivateEvidenceSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 