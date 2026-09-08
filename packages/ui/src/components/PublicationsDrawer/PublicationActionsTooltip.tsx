import { Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledTooltip = styled(Tooltip)(({ theme }) => ({
  "& .MuiTooltip-tooltip": {
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: theme.palette.text.primary,
  },
}));

export default StyledTooltip;
