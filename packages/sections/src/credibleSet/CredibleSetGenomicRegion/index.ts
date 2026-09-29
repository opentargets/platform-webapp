import { lazy } from "react";
import { isPrivateCredibleSetSection } from "@ot/constants";

const id = "credibleSetGenomicRegion";

export const definition = {
  id,
  name: "Genomic Region",
  shortName: "GR",
  hasData: () => true,
  isPrivate: isPrivateCredibleSetSection(id),
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
