import { lazy } from "react";
import CredibleSet from "../CredibleSet";

export const definition = {
  id: "Enhancer_to_gene_predictions",
  name: "Enhancer-to-gene predictions",
  shortName: "EG",
  category: "Target-Variant",
  hasData: (data: CredibleSet) => {
    return (data.variant?.enhancerToGenes?.count || 0) > 0;
  },
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
