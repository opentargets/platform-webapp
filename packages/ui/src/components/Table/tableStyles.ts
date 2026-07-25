import { Box, CircularProgress, Grid, Input, TableCell, TableContainer, TableRow, Table as MuiTable, styled } from "@mui/material";

export const StyledFilterGrid = styled(Grid)(({ theme }) => ({
  order: 0,
  [theme.breakpoints.down("sm")]: {
    order: 1,
  },
}));

export const StyledDownloaderGrid = styled(Grid)(({ theme }) => ({
  order: 1,
  marginLeft: "auto",
  [theme.breakpoints.down("sm")]: {
    order: 0,
  },
}));

export const StyledTableContainer = styled(TableContainer)({
  marginTop: "2rem",
  overflowX: "auto",
  paddingRight: ".1rem", // fixes horizontal scrollbar
});

export const StyledMuiTable = styled(MuiTable, {
  shouldForwardProp: prop => prop !== "fixed",
})<{ fixed?: boolean }>(({ fixed }) => ({
  tableLayout: fixed ? "fixed" : "auto",
}));

export const StyledEmptyRowCell = styled(TableCell)({
  padding: ".25rem .5rem !important",
  fontSize: "0.8125rem",
  textAlign: "center",
});

export const StyledProgress = styled(CircularProgress)({
  position: "relative",
  top: "6px",
});

export const StyledPaginationPlaceholder = styled(Box)({
  height: "36px",
});

export const StyledHeaderLabelSpan = styled("span")({
  lineHeight: "1.625rem",
});

export const StyledHeaderCell = styled(TableCell, {
  shouldForwardProp: prop => prop !== "isHeaderGroup" && prop !== "sticky" && prop !== "noWrapHeader",
})<{ isHeaderGroup?: boolean; sticky?: boolean; noWrapHeader?: boolean }>(
  ({ theme, isHeaderGroup, sticky, noWrapHeader }) => ({
    "&:first-child": {
      paddingLeft: "1rem",
    },
    "&:last-child": {
      paddingRight: "1rem",
    },
    padding: "1rem .5rem !important",
    ...(isHeaderGroup && {
      borderLeft: "1px solid #E0E0E0",
      "&:first-child": {
        borderLeft: "none",
      },
    }),
    ...(sticky && {
      position: "sticky",
      left: 0,
      backgroundColor: theme.palette.grey[100],
    }),
    ...(noWrapHeader && {
      whiteSpace: "nowrap",
    }),
  })
);

export const StyledTableRow = styled(TableRow, {
  shouldForwardProp: prop => prop !== "isFixedRow",
})<{ isFixedRow?: boolean }>(({ theme, isFixedRow }) => ({
  ...(isFixedRow && {
    backgroundColor: theme.palette.grey[300],
  }),
}));

export const StyledBodyCell = styled(TableCell, {
  shouldForwardProp: prop => prop !== "numeric" && prop !== "sticky" && prop !== "noWrap",
})<{ numeric?: boolean; sticky?: boolean; noWrap?: boolean }>(
  ({ theme, numeric, sticky, noWrap }) => ({
    "&:first-child": {
      paddingLeft: "1rem",
    },
    "&:last-child": {
      paddingRight: "1rem",
    },
    padding: ".25rem .5rem !important",
    fontSize: "0.8125rem",
    ...(numeric && {
      fontVariant: "tabular-nums",
    }),
    ...(sticky && {
      position: "sticky",
      left: 0,
      backgroundColor: theme.palette.grey[100],
    }),
    ...(noWrap && {
      whiteSpace: "nowrap",
    }),
  })
);

export const StyledGlobalFilterInput = styled(Input)({
  width: "100%",
});
