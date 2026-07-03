import { rgb } from "d3";

export const waterfallMaxWidth = 600;

export const waterfallMargins = {
  left: 344,
  right: 40,
  top: 32,
  bottom: 36,
};

export const waterfallMaxCanvasWidth =
  waterfallMaxWidth - waterfallMargins.left - waterfallMargins.right;

export const featureToGroup = {
  distanceSentinelFootprint: "Distance",
  distanceSentinelFootprintNeighbourhood: "Distance",
  distanceFootprintMean: "Distance",
  distanceFootprintMeanNeighbourhood: "Distance",
  distanceTssMean: "Distance",
  distanceTssMeanNeighbourhood: "Distance",
  distanceSentinelTss: "Distance",
  distanceSentinelTssNeighbourhood: "Distance",
  vepMaximum: "VEP",
  vepMaximumNeighbourhood: "VEP",
  vepMean: "VEP",
  vepMeanNeighbourhood: "VEP",
  eQtlColocClppMaximum: "eQTL",
  eQtlColocH4Maximum: "eQTL",
  eQtlColocClppMaximumNeighbourhood: "eQTL",
  eQtlColocH4MaximumNeighbourhood: "eQTL",
  pQtlColocH4MaximumNeighbourhood: "pQTL",
  pQtlColocClppMaximum: "pQTL",
  transPQtlColocH4Maximum: "pQTL",
  transPQtlColocH4MaximumNeighbourhood: "pQTL",
  pQtlColocH4Maximum: "pQTL",
  pQtlColocClppMaximumNeighbourhood: "pQTL",
  sQtlColocClppMaximum: "sQTL",
  sQtlColocH4Maximum: "sQTL",
  sQtlColocClppMaximumNeighbourhood: "sQTL",
  sQtlColocH4MaximumNeighbourhood: "sQTL",
  e2gMean: "E2G",
  e2gMeanNeighbourhood: "E2G",
  geneCount500kb: "Other",
  proteinGeneCount500kb: "Other",
  credibleSetConfidence: "Other",

};

export const groupToFeature = Object.groupBy(
  Object.entries(featureToGroup),
  ([feature, group]) => group
);

export const groupNames = Object.keys(groupToFeature);

export const DIVERGING_COLORS = [
  rgb("#a01813"),
  rgb("#bc3a19"),
  rgb("#e08145"),
  rgb("#e3a772"),
  rgb("#e6ca9c"),
  rgb("#f2f2f2"),
  rgb("#c5d2c1"),
  rgb("#9ebaa8"),
  rgb("#78a290"),
  rgb("#2f735f"),
  rgb("#2e5943"),
];
