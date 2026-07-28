import { Box, styled, Typography } from "@mui/material";

export const StyledChip = styled(Box, {
  shouldForwardProp: prop => prop !== "hasData" && prop !== "error",
})<{ hasData?: boolean; error?: boolean }>(({ theme, hasData, error }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.1rem",
  padding: "0 1.5rem 0 0",
  borderRadius: theme.shape.borderRadius * 2,
  overflow: "hidden",
  maxWidth: "100%",
  backgroundColor: theme.palette.common.white,
  border: `1px solid ${theme.palette.grey[300]}`,
  ...(hasData && {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: theme.palette.primary.dark,
      "& .summaryChipLabel": { color: theme.palette.common.white },
    },
  }),
}));

export const StyledLabel = styled(Typography, {
  shouldForwardProp: prop => prop !== "hasData" && prop !== "error",
})<{ hasData?: boolean; error?: boolean }>(({ theme, hasData, error }) => ({
  fontSize: "0.875rem",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  color: error
    ? theme.palette.error.dark
    : hasData
      ? theme.palette.text.primary
      : theme.palette.grey[500],
}));
