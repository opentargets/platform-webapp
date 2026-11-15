import type { CancerHallmarksSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "cancerHallmarks",
  name: "Cancer Hallmarks",
  shortName: "CH",
  hasData: (data: CancerHallmarksSummaryFragment) =>
    (data.hallmarks?.cancerHallmarks?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";

export const getBodyComponent = () => lazy(() => import("./Body"));
