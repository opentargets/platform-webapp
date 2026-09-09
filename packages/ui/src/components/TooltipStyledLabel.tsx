import { Typography } from "@mui/material";
import type { ReactNode } from "react";

type TooltipStyledLabelProps = {
  label: string;
  description: string;
  newline: boolean;
};

/**
 * Styled label for use in the tooltip for consistent look'n'feel.
 * The format is:
 * <bold>label:</bold> description
 * the description can be on a new line (default is on same line)
 */
function TooltipStyledLabel({
  label,
  description,
  newline = false,
}: TooltipStyledLabelProps): ReactNode {
  return (
    <Typography variant="body2">
      {label ? <span style={{ fontWeight: "bold" }}>{label}:</span> : ""} {newline ? <br /> : null}
      {description}
    </Typography>
  );
}

export default TooltipStyledLabel;
