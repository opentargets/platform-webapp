import { lazy } from "react";
import { Variant } from "@ot/constants";

export const definition = {
  id: "Enhancer_to_gene_predictions",
  name: "Enhancer-to-gene predictions",
  shortName: "EG",
  category: "Target-Variant",
  hasData: (data: Variant) => {
    return (data.enhancerToGenes?.count || 0) > 0;
  },
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));