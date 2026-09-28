import { Typography } from "@mui/material";
import { ReactNode } from "react";
import Tooltip from "./Tooltip";

type TooltipRowProps = {
  children: ReactNode;
  label?: string;
  tooltip?: ReactNode;
  tooltipZIndex?: number;
  tooltipOffset?: number;
  valueWidth?: string;
  truncateValue?: boolean;
};

function TooltipRow({
  children,
  label,
  tooltip,
  tooltipZIndex,
  tooltipOffset,
  valueWidth,
  truncateValue = false,
}: TooltipRowProps) {
  const truncateLine = truncateValue
    ? {
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }
    : {};

  return (
    <tr style={{ verticalAlign: "text-bottom" }}>
      <td>
        {label && (
          <Typography
            variant="subtitle2"
            fontSize={13}
            style={{ lineHeight: 1.15, paddingRight: "0.2rem" }}
          >
            {tooltip ? (
              <Tooltip
                title={tooltip}
                showHelpIcon
                slotProps={
                  tooltipZIndex || tooltipOffset
                    ? {
                        popper: {
                          sx: tooltipZIndex ? { zIndex: tooltipZIndex } : undefined,
                          popperOptions: tooltipOffset
                            ? {
                                modifiers: [
                                  {
                                    name: "offset",
                                    options: { offset: [0, tooltipOffset] },
                                  },
                                ],
                              }
                            : undefined,
                        },
                      }
                    : undefined
                }
              >
                {label}
              </Tooltip>
            ) : (
              label
            )}
            :
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
