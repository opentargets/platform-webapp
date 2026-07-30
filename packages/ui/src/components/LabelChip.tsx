import { Typography } from "@mui/material";
import type { ReactElement } from "react";
import OTTooltip from "./Tooltip";

type LabelChipProps = {
  label?: string;
  to?: string;
  tooltip?: string | null;
  value?: string;
};

function LabelChip({ label, value, to, tooltip = null }: LabelChipProps): ReactElement {
  const containerStyle = {
    display: "flex",
    borderRadius: "5px",
    border: "1px solid #3489ca",
    overflow: "hidden",
    color: "#3489ca",
    margin: "3px 0",
    textDecoration: "none",
    width: "min-content",
  };
  const commonStyle = {
    padding: "0 5px",
    "&:hover": {},
  };
  const labelStyle = {
    ...commonStyle,
    backgroundColor: "#3489ca",
    color: "white",
  };
  const valueStyle = {
    ...commonStyle,
    backgroundColor: "white",
    borderLeft: "1px solid #3489ca",
  };
  return (
    <OTTooltip title={tooltip} disableInteractive style={{}}>
      <a href={to} style={containerStyle}>
        {label && (
          <div style={labelStyle}>
            <Typography variant="caption">{label}</Typography>
          </div>
        )}
        {value && (
          <div style={valueStyle}>
            <Typography variant="caption">{value}</Typography>
          </div>
        )}
      </a>
    </OTTooltip>
  );
}

export default LabelChip;
