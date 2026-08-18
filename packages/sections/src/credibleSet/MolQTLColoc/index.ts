import { lazy } from "react";
import { CredibleSet } from "@ot/constants";

export const definition = {
  id: "molqtl_coloc",
  name: "MolQTL Colocalisation",
  shortName: "QC",
  category: "Target-Variant",
  hasData: (data: CredibleSet) => (data.molqtlcolocalisation?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
