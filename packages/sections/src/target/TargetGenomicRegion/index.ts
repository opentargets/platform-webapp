import { isPrivateTargetSection } from "@ot/constants";
import { lazy } from "react";

const id = "targetGenomicRegion";

export const definition = {
  id,
  name: "Genomic Region",
  shortName: "GR",
  hasData: () => true,
  isPrivate: isPrivateTargetSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
