import { lazy } from "react";

export const definition = {
  id: "drugWarnings",
  name: "Drug Warnings",
  shortName: "DW",
  hasData: ({ drugWarnings }: { drugWarnings?: { count: number } }) =>
    (drugWarnings?.count ?? 0) > 0,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body"));
