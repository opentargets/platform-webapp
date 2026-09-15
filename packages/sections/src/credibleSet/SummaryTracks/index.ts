import { lazy } from "react";

export const definition = {
  id: "summaryTracks",
  name: "Summary",
  shortName: "Su",
  hasData: () => true,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 