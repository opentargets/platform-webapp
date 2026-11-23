import type { Study } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "gwas_credible_sets",
  name: "GWAS Credible Sets",
  shortName: "GW",
  hasData: (data: Pick<Study, "credibleSetsView">) => (data.credibleSetsView?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
