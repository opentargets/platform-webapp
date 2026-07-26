import { Chip as MUIChip, styled, type ChipProps as MuiChipProps } from "@mui/material";
import type { ReactElement } from "react";

const StyledMUIChip = styled(MUIChip)({
  height: "20px",
  marginRight: "4px",
  marginBottom: "4px",
  maxWidth: "100%",
});

// Fixed to "outlined"/"small" — callers get the full rest of MUI's ChipProps
// (color, sx, clickable, onClick, etc.) via Omit rather than a hand-picked subset.
type ChipProps = Omit<MuiChipProps, "variant" | "size">;

export default function Chip(props: ChipProps): ReactElement {
  return <StyledMUIChip variant="outlined" size="small" {...props} />;
}
