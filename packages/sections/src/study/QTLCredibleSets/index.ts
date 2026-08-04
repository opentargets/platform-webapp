import { lazy } from "react";
import { Study } from "@ot/constants";

export const definition = {
  id: "qtl_credible_sets",
  name: "molQTL Credible Sets",
  shortName: "QT",
  category: "Target-Variant",
  // @ts-expect-error TODO: fix this
  hasData: (data: Study) => data?.qtlCredibleSets?.count > 0 || data?.credibleSets?.count > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
