import { lazy } from "react";
import { Study } from "@ot/constants";

export const definition = {
  id: "gwas_credible_sets",
  name: "GWAS Credible Sets",
  shortName: "GW",
  category: "Disease-Variant",
  hasData: (data: Study) => (data.credibleSets?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
