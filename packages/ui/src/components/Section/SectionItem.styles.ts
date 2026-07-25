import { Avatar, Box, CardContent, Typography, styled } from "@mui/material";

export const CardHeaderContainer = styled(Box)({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "1rem",
});

export const StyledCardContent = styled(CardContent)(({ theme }) => ({
  borderTop: `1px solid ${theme.palette.grey[300]}`,
  minHeight: 36,
}));

// NOTE: under the old JSS makeStyles, `avatarHasData`'s `!important` background
// always won over `avatarError`'s non-important one (both were applied together
// whenever hasData was true), so the avatar never actually turned "error" colored.
// Preserved as-is here rather than fixed, to keep this migration a pure refactor.
export const StyledAvatar = styled(Avatar)(({ theme }) => ({
  color: "white",
  backgroundColor: theme.palette.primary.dark,
}));

export const StyledTitle = styled("div", {
  shouldForwardProp: prop => prop !== "error",
})<{ error?: boolean }>(({ theme, error }) => ({
  color: error ? theme.palette.secondary.main : theme.palette.grey[700],
  fontWeight: "bold !important",
  fontSize: "1.2rem !important",
  display: "flex",
  gap: "1rem",
  alignItems: "center",
  height: "100%",
}));

// NOTE: same as StyledAvatar above — under JSS, `descriptionHasData`'s rule was
// declared after `descriptionError`'s, so with equal (non-important) specificity
// it always won when both were applied. The description never actually turned
// "error" colored either. Preserved as-is.
export const StyledDescription = styled(Typography)(({ theme }) => ({
  fontStyle: "italic",
  fontSize: "0.8rem",
  color: theme.palette.grey[700],
}));

export const StyledChip = styled(Box)(({ theme }) => ({
  padding: "0 8px",
  borderRadius: 10,
  border: `1px solid ${theme.palette.grey[500]}`,
}));

export const NoData = styled("div")({
  display: "flex",
  fontStyle: "italic",
  justifyContent: "center",
});
