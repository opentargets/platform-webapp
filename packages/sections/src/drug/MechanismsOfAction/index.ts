import type { MechanismsOfActionSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "mechanismsOfAction",
  name: "Mechanisms of Action",
  shortName: "MA",
  hasData: (data: MechanismsOfActionSummaryFragment) =>
    (data.mechanismsOfAction?.uniqueActionTypes.length ?? 0) > 0 &&
    (data.mechanismsOfAction?.uniqueTargetTypes.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
