import { makeStyles } from "@mui/styles";
import { Tooltip as MUITooltip } from "@mui/material";
import { merge } from "lodash";

function OntologyTooltip({ style, children, title, showHelpIcon = false, placement = "top" }) {
  const classes = makeStyles(theme => {
    return merge(style, {
      tooltip: {
        backgroundColor: `${theme.palette.background.paper} !important`,
        border: `1px solid ${theme.palette.grey[300]}`,
        color: `${theme.palette.text.primary} !important`,
      },
      tooltipBadge: {
        paddingLeft: "1rem",
        top: ".4rem",
      },
      tooltipIcon: {
        fontWeight: "500",
        cursor: "default",
      },
      tooltipArrow: {
        backgroundColor: `${theme.palette.background.paper} !important`,
      },
    });
  })();

  return (
    <MUITooltip placement={placement} classes={{ tooltip: classes.tooltip }} title={title}>
      {children}
    </MUITooltip>
  );
}

export default OntologyTooltip;
