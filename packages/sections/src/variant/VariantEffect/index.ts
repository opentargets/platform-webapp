import { lazy } from "react";
import { Variant } from "@ot/constants";

export const definition = {
  id: "in_silico_predictors",
  name: "Variant effect",
  shortName: "VP",
  category: "Target-Variant",
  hasData: (data: Variant) => (data.variantEffect?.length || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
