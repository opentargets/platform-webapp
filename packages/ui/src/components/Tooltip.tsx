import { Tooltip as MUITooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

// NOTE: `style` only ever meaningfully overrides `tooltipIcon` (see
// ClinicalRecordDrawer.tsx, which passes { tooltipIcon: {...} }). The old
// makeStyles-based merge() also accepted a `tooltip` override key and defined
// tooltipBadge/tooltipArrow classes, but neither of the latter two was ever
// applied to any element (confirmed dead), and no caller ever overrode
// `tooltip`. One caller (DirectionalityDrawer.tsx) passes an unrelated shape,
// { background: "red" } - since "background" never matched any of the merged
// keys, it was already a no-op under the old implementation; preserved as such.
const StyledMUITooltip = styled(MUITooltip)(({ theme }) => ({
  "& .MuiTooltip-tooltip": {
    backgroundColor: `${theme.palette.background.paper} !important`,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: `${theme.palette.text.primary} !important`,
  },
}));

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
      <StyledMUITooltip
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
      </StyledMUITooltip>
    </>
  );
}

export default Tooltip;
