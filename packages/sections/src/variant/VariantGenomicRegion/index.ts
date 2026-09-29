import { lazy } from "react";
import { isPrivateVariantSection } from "@ot/constants";

const id = "variantGenomicRegion";

export const definition = {
  id,
  name: "Genomic Region",
  shortName: "GR",
  hasData: () => true,
  isPrivate: isPrivateVariantSection(id),
};

export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
