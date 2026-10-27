import type { TractabilitySummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "tractability",
  name: "Tractability",
  shortName: "TR",
  hasData: (data: TractabilitySummaryFragment) => (data.tractability?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
