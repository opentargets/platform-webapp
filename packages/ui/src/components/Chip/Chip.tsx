import { Chip as MUIChip, type ChipProps as MuiChipProps, styled } from "@mui/material";
import { forwardRef } from "react";

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

// forwardRef because MUI's real Chip forwards its ref (needed e.g. as the
// direct child of Grow/Fade/Collapse, which attach a ref to measure/animate it).
const Chip = forwardRef<HTMLDivElement, ChipProps>(function Chip(props, ref) {
  return <StyledMUIChip ref={ref} variant="outlined" size="small" {...props} />;
});

export default Chip;
