import { Chip as MUIChip, styled, type ChipProps as MuiChipProps } from "@mui/material";
import type { ReactElement } from "react";

// The compact sizing only applies to the default look (outlined/small, the
// original "tag chip" this component was built for) — callers that explicitly
// opt into a different variant/size (e.g. a filled, medium, clickable
// selection chip) get MUI's native sizing instead of being force-shrunk.
const StyledMUIChip = styled(MUIChip)(({ variant, size }) =>
  variant === "outlined" && size === "small"
    ? {
        height: "20px",
        marginRight: "4px",
        marginBottom: "4px",
        maxWidth: "100%",
      }
    : {}
);

// Defaults to "outlined"/"small"; overridable via the full MUI ChipProps API
// (color, sx, clickable, onClick, etc.) since {...props} is spread last.
type ChipProps = MuiChipProps;

export default function Chip(props: ChipProps): ReactElement {
  return <StyledMUIChip variant="outlined" size="small" {...props} />;
}
