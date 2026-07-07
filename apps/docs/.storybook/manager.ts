import { addons } from "storybook/manager-api";
import { create } from "storybook/theming/create";

const theme = create({
  base: "light",
  brandTitle: "Open Targets",
  brandImage: "./OT_logo_colour.svg",
  brandUrl: "https://platform.opentargets.org",
  brandTarget: "_blank",
  colorPrimary: "#3489ca",
  colorSecondary: "#18405e",
  appBg: "#f8fafc",
  appContentBg: "#ffffff",
  appBorderColor: "#e2e8f0",
  appBorderRadius: 2,
  fontBase: '"Inter", sans-serif',
  textColor: "#5A5F5F",
  textInverseColor: "#ffffff",
  barTextColor: "#5A5F5F",
  barSelectedColor: "#3489ca",
  barBg: "#ffffff",
  inputBg: "#ffffff",
  inputBorder: "#e2e8f0",
  inputTextColor: "#5A5F5F",
  inputBorderRadius: 2,
});

addons.setConfig({
  theme,
});
