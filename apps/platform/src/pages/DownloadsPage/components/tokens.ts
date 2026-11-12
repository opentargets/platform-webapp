/**
 * Design tokens for the Datasets page components that the MUI theme doesn't
 * already carry. Everything the theme does have (palette, grey ramp,
 * theme.boxShadow.*) is read from the theme at the point of use.
 */

import type { Theme } from "@mui/material/styles";

/** Buttons, inputs, cards, drawers. Pills (chips, badge) are fully round instead. */
export const RADIUS = "2px";
/** The MUI outlined-button border the theme uses for every control */
export const CONTROL_BORDER = "rgb(196,196,196)";
export const BADGE_COLOR = "#c0392b";
export const MONO_FONT = "'Roboto Mono', monospace";

const SHADOW_FALLBACK = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
};

type ThemeWithShadows = Theme & { boxShadow?: Partial<Record<keyof typeof SHADOW_FALLBACK, string>> };

/** theme.boxShadow.{sm,md,lg} from ot-config's theme, with the spec values as fallback */
export const shadow = (theme: Theme, size: keyof typeof SHADOW_FALLBACK): string =>
  (theme as ThemeWithShadows).boxShadow?.[size] ?? SHADOW_FALLBACK[size];

/** Disabled controls: dimmed and inert, unless they must stay focusable (then use aria-disabled). */
export const DISABLED_SX = { opacity: 0.45, pointerEvents: "none" } as const;

/**
 * Visually hidden but still read by screen readers. Pixel strings on purpose:
 * in `sx`, a bare `width: 1` means 100%, which stretched the live region past
 * the viewport and gave the page a horizontal scrollbar.
 */
export const VISUALLY_HIDDEN_SX = {
  position: "absolute",
  left: 0,
  top: 0,
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;
