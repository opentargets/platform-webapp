import { lazy } from "react";

export const definition = {
  id: "genTrackTest",
  name: "GenTrack Test",
  shortName: "GT",
  hasData: () => true,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 