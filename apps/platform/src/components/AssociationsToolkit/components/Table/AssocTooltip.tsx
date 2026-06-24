import { withStyles } from "@mui/styles";
import Tooltip from "@mui/material/Tooltip";

const HtmlTooltip = withStyles(theme => ({
  tooltip: {
    backgroundColor: `${theme.palette.background.paper} !important`,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: `${theme.palette.text.primary} !important`,
  },
  arrow: {
    color: `${theme.palette.background.paper} !important`,
  },
}))(Tooltip);

export default HtmlTooltip;
