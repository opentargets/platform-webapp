import { createTheme } from "@mui/material";

/**
 * Shared MUI theme used by all widget IIFE bundles.
 *
 * Mirrors the platform's custom theme extensions (boxShadow, typography variants)
 * so platform section components render without crashes when used as widgets.
 */
export const theme = createTheme({
  shape: { borderRadius: 2 },
  typography: { fontFamily: '"Inter", sans-serif' },
  palette: {
    primary: { main: "#3489ca" },
    secondary: { main: "#ff6350" },
    text: { primary: "#5A5F5F" },
  },
  // Custom platform theme extensions — match packages/ot-config/src/theme.ts
  // so any section component accessing theme.boxShadow etc. works correctly.
  // @ts-ignore: not in MUI's default ThemeOptions type
  boxShadow: {
    value: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
});
