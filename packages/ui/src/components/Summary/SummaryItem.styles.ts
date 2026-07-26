import { Avatar, Card, styled, Typography } from "@mui/material";

export const StyledAvatar = styled(Avatar, {
  shouldForwardProp: (prop) => prop !== "hasData" && prop !== "error",
})<{ hasData?: boolean; error?: boolean }>(({ theme, hasData, error }) => ({
  color: "white",
  backgroundColor: error
    ? theme.palette.secondary.main
    : hasData
      ? theme.palette.primary.dark
      : theme.palette.grey[300],
}));

export const StyledTitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "hasData" && prop !== "error",
})<{ hasData?: boolean; error?: boolean }>(({ theme, hasData, error }) => ({
  wordBreak: "break-word",
  color: error
    ? theme.palette.secondary.main
    : hasData
      ? theme.palette.text.primary
      : theme.palette.grey[500],
}));

export const StyledSubtitle = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "hasData",
})<{ hasData?: boolean }>(({ theme, hasData }) => ({
  color: hasData ? theme.palette.text.primary : theme.palette.grey[500],
}));

// NOTE: under the old JSS makeStyles, `subheaderError` was applied unconditionally
// (`[classes.subheaderError]: true`, not tied to the actual `error` value), and its
// rule was declared after `subheaderHasData`'s, so at equal specificity it always
// won. The subheader was therefore always rendered in the "error" color regardless
// of hasData/error state — subheaderHasData had no visible effect on its own.
// Preserved as-is; the hover-white override below still applies (it comes from a
// higher-specificity JSS selector in the original, reproduced here via StyledCard).
export const StyledSubheader = styled(Typography)(({ theme }) => ({
  fontSize: "0.8rem",
  fontStyle: "italic",
  color: theme.palette.secondary.main,
}));

// NOTE: the old `cardError` class was referenced in SummaryItem's classNames() call
// but never existed in makeStyles, so it was always a no-op (JSS silently applied
// no class). No `error` prop is carried here for the same reason.
export const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== "hasData",
})<{ hasData?: boolean }>(({ theme, hasData }) => ({
  height: "100%",
  display: "flex",
  flexDirection: "row",
  ...(hasData && {
    cursor: "pointer",
    "&:hover": {
      transition: "background-color ease-in-out 300ms",
      backgroundColor: theme.palette.primary.dark,
    },
    // NOTE: this project's Vite build has no @emotion/babel-plugin configured, so
    // emotion's `${StyledComponent}` selector-interpolation feature (which needs that
    // plugin to tag components with a stable target class) silently resolves to
    // "no_component_selector" instead of a real selector. Targeting plain, manually
    // assigned class names below instead, which works without the plugin.
    "&:hover .summaryItemTitle": { color: "white" },
    "&:hover .summaryItemSubtitle": { color: "white" },
    "&:hover .summaryItemSubheader": { color: "white" },
    "&:hover .summaryItemAvatar": {
      color: theme.palette.primary.dark,
      backgroundColor: "white !important",
    },
  }),
}));
