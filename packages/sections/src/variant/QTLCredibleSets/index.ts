import { lazy } from "react";
import { Variant } from "@ot/constants";

export const definition = {
  id: "qtl_credible_sets",
  name: "molQTL Credible Sets",
  shortName: "QT",
  category: "Target-Variant",
  // @ts-expect-error TODO: fix this
  hasData: (data: Variant) => (data.qtlCredibleSets?.count || 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
