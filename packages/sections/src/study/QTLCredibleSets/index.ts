import type { Study } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "qtl_credible_sets",
  name: "molQTL Credible Sets",
  shortName: "QT",
  hasData: (data: {
    qtlCredibleSets?: Pick<Study["credibleSetsView"], "count">;
    credibleSetsView?: Pick<Study["credibleSetsView"], "count">;
  }) => (data?.qtlCredibleSets?.count ?? data?.credibleSetsView?.count ?? 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
