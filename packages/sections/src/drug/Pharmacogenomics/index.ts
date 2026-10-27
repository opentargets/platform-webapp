import type { DrugPharmacogenomicsSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "pharmacogenetics",
  name: "Pharmacogenetics",
  shortName: "PGx",
  hasData: (data: DrugPharmacogenomicsSummaryFragment) => (data.pharmacogenomics?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
