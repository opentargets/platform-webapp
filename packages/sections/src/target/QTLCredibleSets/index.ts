import { lazy } from "react";
import { Target } from "@ot/constants";

export const definition = {
  id: "qtl_credible_sets",
  name: "molQTL Credible Sets",
  shortName: "QT",
  category: "Target-Variant",
  // @ts-expect-error TODO: fix this
  hasData: (data: Target) => (data.credibleSets?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
