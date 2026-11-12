import type { IndicationsSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "Indications",
  name: "Indications",
  shortName: "I",
  hasData: (data: IndicationsSummaryFragment) => (data?.indications?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
