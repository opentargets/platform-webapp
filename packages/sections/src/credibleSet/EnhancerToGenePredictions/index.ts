import { lazy } from "react";
import type { CredibleSet } from "@ot/constants";

export const definition = {
  id: "Enhancer_to_gene_predictions",
  name: "Enhancer-to-gene predictions",
  shortName: "EG",
  hasData: (data: CredibleSet) => {
    return (data.leadVariant?.enhancerToGene?.count || 0) > 0;
  },
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
