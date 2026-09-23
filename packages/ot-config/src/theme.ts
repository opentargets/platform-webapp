import { grey } from "@mui/material/colors";
import { createTheme, type ThemeOptions } from "@mui/material/styles";
import { darken, lighten } from "polished";
import { getConfig } from "./environment";

const config = getConfig();

const PRIMARY: string = config.profile.primaryColor;
const SECONDARY: string = config.profile.secondaryColor;

const themeOptions: ThemeOptions = {
  shape: {
    borderRadius: 2,
  },
  boxShadow: {
    value: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  },
  typography: {
    fontFamily: '"Inter", sans-serif',
    assoc_header: {
      fontSize: ".90rem",
      fontWeight: 700,
    },
    monoText: {
      fontFamily: "'Roboto Mono', monospace",
      fontSize: ".875rem",
    },
    controlHeader: {
      fontSize: "1rem",
      fontWeight: 700,
    },
  },
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
    plain: {
      main: grey[700],
    },
    text: {
      primary: "#5A5F5F",
    },
    footer: "#2e2d35",
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableRipple: true,
      },
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
        contained: {
          backgroundColor: SECONDARY,
          color: "#fff",
          border: "none",
          "&:hover": {
            backgroundColor: darken(0.1, SECONDARY),
          },
          "&:active": {
            backgroundColor: darken(0.2, SECONDARY),
          },
          "&:disabled": {
            backgroundColor: grey[300],
            color: grey[500],
          },
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          boxShadow: "none",
          border: `1px solid ${grey[400]}`,
          marginTop: -1,
        },
      },
    },
    MuiMenuItem: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiToggleButton: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          border: "none",
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 8,
          paddingRight: 8,
          minHeight: "32px",
          textTransform: "none",
          color: "#5A5F5F",
          "&:hover": {
            backgroundColor: "rgba(80, 80, 80, 0.1)",
          },
          "&.Mui-selected": {
            color: darken(0.2, PRIMARY),
            border: "1px solid",
            borderColor: "rgb(196,196,196)",
            backgroundColor: grey[50],
          },
          "&.Mui-selected:hover": {
            backgroundColor: grey[100],
          },
          "&.Mui-selected.MuiToggleButtonGroup-lastButton": {
            borderLeft: "1px solid",
            borderColor: "rgb(196,196,196)",
            borderRadius: "2px",
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          paddingTop: 6,
          paddingBottom: 6,
          paddingLeft: 10,
          paddingRight: 10,
          backgroundColor: grey[200],
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          transition: "none",
        },
      },
    },
    MuiTab: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: ({ theme }) => ({
          backgroundColor: `${theme.palette.background.paper} !important`,
          border: `1px solid ${theme.palette.grey[300]}`,
          color: `${theme.palette.text.primary} !important`,
        }),
      },
      variants: [
        {
          props: { variant: "aotf" },
          style: {
            root: {
              backgroundColor: `red`,
              color: "#fff",
            },
          },
        },
      ],
    },
    MuiSnackbar: {
      defaultProps: {
        anchorOrigin: {
          vertical: "bottom",
          horizontal: "center",
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          background: PRIMARY,
          color: "white",
          borderRadius: "4px",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontSize: "1.2rem",
          fontWeight: 500,
        },
      },
    },
    MuiRadio: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
};

export const theme = createTheme(themeOptions);
