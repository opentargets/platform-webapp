import { lazy } from "react";
import { CredibleSet } from "@ot/constants";

export const definition = {
  id: "locus2gene",
  name: "Locus-to-Gene",
  shortName: "LG",
  category: "Target-Variant",
  hasData: (data: CredibleSet) => (data.l2GPredictions?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
