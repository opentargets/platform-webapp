import type { TargetQtlCredibleSetsSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "qtl_credible_sets",
  name: "molQTL Credible Sets",
  shortName: "QT",
  hasData: (data: TargetQtlCredibleSetsSummaryFragment) => (data.credibleSets?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
