import type { DepmapSummaryFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "depMapEssentiality",
  name: "Cancer DepMap",
  shortName: "DM",
  hasData: (data: DepmapSummaryFragment) => (data.depMapEssentiality?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
