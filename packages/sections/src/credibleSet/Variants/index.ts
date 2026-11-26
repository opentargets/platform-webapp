import { lazy } from "react";
import type { CredibleSet } from "@ot/constants";

export const definition = {
  id: "variants",
  name: "Credible Set Variants",
  shortName: "VA",
  hasData: (data: Pick<CredibleSet, "locusView">) => (data.locusView?.count || 0) > 0,
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
