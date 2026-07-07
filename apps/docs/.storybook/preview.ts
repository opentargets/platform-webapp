import { createTheme } from "@mui/material/styles";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import { getConfig } from "@ot/config";
import type { Preview } from "@storybook/react-vite";
import { darken, lighten } from "polished";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { OTApolloProvider, ThemeProvider } from "ui";
import "./preview.css";

const PRIMARY = "#3489ca";
const SECONDARY = "#18405e";

const lightTheme = createTheme({
  shape: { borderRadius: 2 },
  typography: { fontFamily: '"Inter", sans-serif' },
  palette: {
    primary: {
      light: lighten(0.2, PRIMARY),
      main: PRIMARY,
      dark: darken(0.2, PRIMARY),
      contrastText: "#fff",
    },
    secondary: {
      light: lighten(0.2, SECONDARY),
      main: SECONDARY,
      dark: darken(0.2, SECONDARY),
      contrastText: "#fff",
    },
    text: { primary: "#5A5F5F" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          border: "1px solid",
          padding: "6px 12px",
          minWidth: "32px",
          minHeight: "32px",
          height: "32px",
          textTransform: "none",
          color: "#5A5F5F",
          borderColor: "rgb(196,196,196)",
        },
      },
    },
    MuiTab: {
      defaultProps: { disableRipple: true },
      styleOverrides: { root: { textTransform: "none" } },
    },
  },
});

const darkTheme = createTheme({
  shape: { borderRadius: 2 },
  typography: { fontFamily: '"Inter", sans-serif' },
  palette: {
    mode: "dark",
    primary: {
      light: lighten(0.2, PRIMARY),
      main: PRIMARY,
      dark: darken(0.2, PRIMARY),
      contrastText: "#fff",
    },
    secondary: {
      light: lighten(0.2, SECONDARY),
      main: SECONDARY,
      dark: darken(0.2, SECONDARY),
      contrastText: "#fff",
    },
    text: { primary: "#e2e8f0" },
    background: { default: "#0e1c2e", paper: "#152436" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          border: "1px solid",
          padding: "6px 12px",
          minWidth: "32px",
          minHeight: "32px",
          height: "32px",
          textTransform: "none",
          color: "#e2e8f0",
          borderColor: "rgba(255,255,255,0.15)",
        },
      },
    },
    MuiTab: {
      defaultProps: { disableRipple: true },
      styleOverrides: { root: { textTransform: "none" } },
    },
  },
});

const config = getConfig();

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: [
          "Introduction",
          "Getting Started",
          "Architecture",
          "Theme & Colors",
          "Packages",
          "Components",
          "Configuration",
          "UI Components",
          "Sections",
          ["Associations on the Fly", ["Overview", "Integration"]],
        ],
      },
    },
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
    (Story, context) => {
      const isDark = context.globals?.theme === "dark";
      return React.createElement(
        MemoryRouter,
        { initialEntries: ["/"] },
        React.createElement(OTApolloProvider, {
          config,
          // biome-ignore lint/correctness/noChildrenProp: TODO: fix this
          children: React.createElement(ThemeProvider, {
            theme: isDark ? darkTheme : lightTheme,
            // biome-ignore lint/correctness/noChildrenProp: TODO: fix this
            children: React.createElement(Story),
          }),
        })
      );
    },
  ],
};

export default preview;
