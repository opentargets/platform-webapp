import {
  faArrowTrendDown,
  faArrowTrendUp,
  faCircleExclamation,
  faQuestion,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Divider, Tooltip } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

const StyledTooltip = styled(Tooltip)(({ theme }) => ({
  "& .MuiTooltip-tooltip": {
    backgroundColor: `${theme.palette.background.paper} !important`,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: `${theme.palette.text.primary} !important`,
  },
}));

type DirectionOfEffectIconProp = {
  variantEffect: string;
  directionOnTrait: string;
};

const LABEL = {
  lof: {
    label: "Loss of Function",
    icon: faArrowTrendDown,
  },
  gof: {
    label: "Gain of Function",
    icon: faArrowTrendUp,
  },
  risk: {
    label: "Risk",
    icon: faCircleExclamation,
  },
  protect: {
    label: "Protective",
    icon: faShieldHalved,
  },
  default: {
    label: "Inconclusive Assessment",
    icon: faQuestion,
  },
};

function DirectionOfEffectIcon({
  variantEffect,
  directionOnTrait,
}: DirectionOfEffectIconProp): ReactNode {
  const theme = useTheme();
  const variant = variantEffect || "default";
  const direction = directionOnTrait || "default";

  function getTooltipText() {
    return `${LABEL[variant.toLowerCase()].label} │ ${LABEL[direction.toLowerCase()].label}`;
  }

  const tooltipText = getTooltipText();

  return (
    <Box sx={{ display: "flex" }}>
      <StyledTooltip placement="top" title={tooltipText}>
        <Box
          sx={{
            width: 0.7,
            padding: 1,
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            background: (theme) => theme.palette.grey[200],
            borderRadius: 4,
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "center", width: 20 }}>
            <FontAwesomeIcon
              color={theme.palette.primary.main}
              icon={LABEL[variant.toLowerCase()].icon}
            />
          </Box>
          <Divider orientation="vertical" variant="middle" />
          <Box sx={{ display: "flex", justifyContent: "center", width: 20 }}>
            <FontAwesomeIcon
              color={theme.palette.primary.main}
              icon={LABEL[direction.toLowerCase()].icon}
            />
          </Box>
        </Box>
      </StyledTooltip>
    </Box>
  );
}

export default DirectionOfEffectIcon;
