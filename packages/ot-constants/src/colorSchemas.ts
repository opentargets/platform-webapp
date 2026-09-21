import { type RGBColor, rgb } from "d3";

export const CATEGORICAL_SCHEME_BASE: string[] =
  [
    "#F2AA45",
    "#F13F5D",
    "#789BB9",
    "#C85F7A",
    "#008B8B",
    "#326B96",
    "#9B72BD",
    "#66A84E",
    "#E9825F",
  ];

  // [
  //   "#F0BA70",
  //   "#F55D73",
  //   "#92ACC4",
  //   "#C77F92",
  //   "#078F91",
  //   "#447899",
  //   "#B18FC5",
  //   "#8EB276",
  //   "#DF9B82",
  // ];

export const SEQUENTIAL_SCHEME_BLUE: string[] = [
  "#dbeaf6",
  "#BFDAEE",
  "#A5CAE6",
  "#8ABADE",
  "#6EA9D7",
  "#4F97CF",
  "#3583C0",
  "#2C6EA0",
  "#245780",
];

export const DIVERGENT_SCHEME_RED_GREEN: RGBColor[] = [
  rgb("#a01813"),
  rgb("#bc3a19"),
  rgb("#d65a1f"),
  rgb("#e08145"),
  rgb("#e3a772"),
  rgb("#e6ca9c"),
  rgb("#eceada"),
  rgb("#c5d2c1"),
  rgb("#9ebaa8"),
  rgb("#78a290"),
  rgb("#528b78"),
  rgb("#2f735f"),
  rgb("#2e5943"),
];

export const DIVERGENT_SCHEME_RED_BLUE: RGBColor[] = [
  rgb("#a01813"),
  rgb("#bc3a19"),
  rgb("#d65a1f"),
  rgb("#e08145"),
  rgb("#e3a772"),
  rgb("#e6ca9c"),
  rgb("#eceada"),
  rgb("#8ABADE"),
  rgb("#6EA9D7"),
  rgb("#4F97CF"),
  rgb("#3583C0"),
  rgb("#2C6EA0"),
  rgb("#245780"),
];
