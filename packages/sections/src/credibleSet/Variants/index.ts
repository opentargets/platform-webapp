import { lazy } from "react";
import { CredibleSet } from "@ot/constants";

export const definition = {
  id: "variants",
  name: "Credible Set Variants",
  shortName: "VA",
  category: ["Target-Variant", "Disease-Variant"],
  hasData: (data: CredibleSet) => (data.locus?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
