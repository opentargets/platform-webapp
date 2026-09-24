import { Tooltip as MUITooltip } from "@mui/material";

function Tooltip({
  style = {},
  children,
  title,
  showHelpIcon = false,
  placement = "top",
  ...props
}) {
  return (
    <>
      {showHelpIcon && children}
      <MUITooltip
        placement={placement}
        title={title}
        // TODO: review props spreading
        // eslint-disable-next-line
        {...props}
      >
        {showHelpIcon ? (
          <sup style={{ fontWeight: "500", cursor: "default", ...style?.tooltipIcon }}>?</sup>
        ) : (
          <span>{children}</span>
        )}
      </MUITooltip>
    </>
  );
}

export default Tooltip;
