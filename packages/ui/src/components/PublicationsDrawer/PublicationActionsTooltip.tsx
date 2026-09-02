import { Tooltip } from "@mui/material";
import { withStyles } from "@mui/styles";

const StyledTooltip = withStyles(theme => ({
  tooltip: {
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: theme.palette.text.primary,
  },
}))(Tooltip);

export default StyledTooltip;
