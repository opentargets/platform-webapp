import { lazy } from "react";
import type { CredibleSetColocalisationPage } from "@ot/constants";

type SummaryData = {
  molqtlcolocalisation?: Pick<CredibleSetColocalisationPage, "count"> | null;
};

export const definition = {
  id: "molqtl_coloc",
  name: "MolQTL Colocalisation",
  shortName: "QC",
  hasData: (data: SummaryData) => (data.molqtlcolocalisation?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
