import { lazy } from "react";
import { CredibleSet } from "@ot/constants";

export const definition = {
  id: "gwas_coloc",
  name: "GWAS Colocalisation",
  shortName: "GC",
  category: "Disease-Variant",
  hasData: (data: CredibleSet) => (data.colocalisation?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
