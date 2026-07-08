import { makeStyles } from "@mui/styles";
import { Tooltip as MUITooltip } from "@mui/material";
import { merge } from "lodash";

function Tooltip({
  style = "",
  children,
  title,
  showHelpIcon = false,
  placement = "top",
  ...props
}) {
  const classes = makeStyles(theme =>
    merge(style, {
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
    })
  )();

  return (
    <>
      {showHelpIcon && children}
      <MUITooltip
        placement={placement}
        classes={{ tooltip: classes.tooltip }}
        title={title}
        // TODO: review props spreading
        // eslint-disable-next-line
        {...props}
      >
        {showHelpIcon ? <sup className={classes.tooltipIcon}>?</sup> : <span>{children}</span>}
      </MUITooltip>
    </>
  );
}

export default Tooltip;
