import type { GeneOntologySummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "geneOntology",
  name: "Gene Ontology",
  shortName: "GO",
  hasData: (data: GeneOntologySummaryFragment) => (data.geneOntology?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 