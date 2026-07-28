import { lazy } from "react";
import { TargetData } from "../../types/target";

export const definition = {
  id: "geneOntology",
  name: "Gene Ontology",
  shortName: "GO",
  category: "Target",
  hasData: (data: TargetData) => (data.geneOntology?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 