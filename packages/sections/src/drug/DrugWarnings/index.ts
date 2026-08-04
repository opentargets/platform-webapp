import { lazy } from "react";

export const definition = {
  id: "drugWarnings",
  name: "Drug Warnings",
  shortName: "DW",
  category: "Drug",
   hasData: ({ drugWarnings }: { drugWarnings?: { warningType: string }[] }) => (drugWarnings?.length ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 