import { lazy } from "react";

export const definition = {
  id: "genTrackTestNew",
  name: "GenTrack Test New",
  shortName: "GTN",
  hasData: () => true,
};

// Components
export { default as Summary } from "./Summary";
export const getBodyComponent = () => lazy(() => import("./Body")); 
