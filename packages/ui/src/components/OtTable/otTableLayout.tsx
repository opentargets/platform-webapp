import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, styled } from "@mui/material";

export const OtTableContainer = styled("table")(({ theme }) => ({
  whiteSpace: "nowrap",
  borderCollapse: "collapse",
  minWidth: "100%",
  "& thead": {
    "& tr": {
      "&:hover": {
        backgroundColor: "transparent",
      },
      "&:first-of-type:not(:last-child)": {
        "& th:not(:last-child)": {
          borderRight: `1px solid ${theme.palette.grey[300]}`,
        },
      },
    },
  },
  "& tr": {
    borderBottom: `1px solid ${theme.palette.grey[300]}`,
    "&:hover": {
      backgroundColor: theme.palette.grey[100],
    },
    "& td": {
      padding: "0.25rem 0.5rem",
    },
    "& th": {
      padding: "1rem 0.5rem",
    },
  },
}));

export const OtTableHeader = styled("div", {
  shouldForwardProp: (prop) => prop !== "canBeSorted" && prop !== "numeric",
})(({ theme, canBeSorted, numeric }) =>
  theme.unstable_sx({
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    cursor: canBeSorted ? "pointer" : "auto",
    "& .sortableColumn": {
      visibility: "hidden",
      padding: "0 0.4rem",
    },
    "&:hover .sortableColumn": {
      visibility: "visible",
      opacity: "0.5",
    },
    ...(numeric && {
      display: "flex",
      justifyContent: "flex-end",
      pr: 2,
    }),
  })
);

export const FontAwesomeIconPadded = styled(FontAwesomeIcon)(({ theme }) => ({
  padding: `0 ${theme.spacing(1)}`,
}));

export const OtTH = styled("th", {
  shouldForwardProp: (prop) => prop !== "stickyColumn",
})(({ theme, stickyColumn }) => ({
  ...(stickyColumn && {
    left: "0",
    position: "sticky",
    backgroundColor: theme.palette.grey[100],
    zIndex: 1,
  }),
}));

export const OtTD = styled("td", {
  shouldForwardProp: (prop) => prop !== "stickyColumn",
})(({ theme, stickyColumn }) => ({
  ...(stickyColumn && {
    left: "0",
    position: "sticky",
    backgroundColor: theme.palette.grey[100],
    zIndex: 1,
  }),
}));

export const OtTR = styled("tr", {
  shouldForwardProp: (prop) => prop !== "enableRowSelection" && prop !== "isSelected",
})(({ theme, enableRowSelection, isSelected }) =>
  theme.unstable_sx({
    ...(enableRowSelection && {
      cursor: "pointer",
    }),
    ...(isSelected && {
      backgroundColor: theme.palette.grey[100],
    }),
  })
);

export const OtTableHeaderText = styled(Box, {
  shouldForwardProp: (prop) => prop !== "verticalHeader",
})(({ theme, verticalHeader }) =>
  theme.unstable_sx({
    typography: "subtitle2",
    ...(verticalHeader && {
      writingMode: "vertical-rl",
      transform: "rotate(180deg)",
      maxHeight: "20rem",
      height: "14rem",
    }),
  })
);

export const OtTableCellContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== "numeric",
})(({ theme, numeric }) =>
  theme.unstable_sx({
    typography: "body2",
    ...(numeric && {
      fontVariantNumeric: "tabular-nums",
      display: "flex",
      justifyContent: "flex-end",
      pr: 2,
    }),
  })
);
