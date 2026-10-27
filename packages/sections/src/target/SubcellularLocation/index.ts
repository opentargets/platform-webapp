import type { SubcellularLocationFragment } from "@ot/constants";
import { lazy } from "react";

export const definition = {
  id: "subcellularLocation",
  name: "Subcellular Location",
  shortName: "SL",
  hasData: (data: SubcellularLocationFragment) => (data.subcellularLocations?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
