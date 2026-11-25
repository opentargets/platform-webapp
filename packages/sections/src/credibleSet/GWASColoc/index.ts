import { lazy } from "react";
import type { CredibleSet } from "@ot/constants";

export const definition = {
  id: "gwas_coloc",
  name: "GWAS Colocalisation",
  shortName: "GC",
  hasData: (data: Pick<CredibleSet, "colocalisationView">) => (data.colocalisationView?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
