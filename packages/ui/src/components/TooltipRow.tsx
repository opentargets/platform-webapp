import { Typography } from "@mui/material";
import { ReactNode } from "react";

type TooltipRowProps = {
  children: ReactNode;
  label?: string;
  valueWidth?: string;
  truncateValue?: boolean;
};

function TooltipRow({ children, label, valueWidth, truncateValue = false }: TooltipRowProps) {
  const truncateLine = truncateValue
    ? {
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }
    : {};

  return (
    <tr style={{ verticalAlign: "top" }}>
      <td>
        {label && (
          <Typography
            variant="subtitle2"
            fontSize={13}
            style={{ lineHeight: 1.15, paddingRight: "0.2rem" }}
          >
            {label}:
          </Typography>
        )}
      </td>
      <td>
        <Typography
          variant="body2"
          component="div"
          fontSize={13}
          style={{ lineHeight: 1.15, ...truncateLine, width: valueWidth }}
        >
          {children}
        </Typography>
      </td>
    </tr>
  );
}

export default TooltipRow;
