import { styled } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";

const HtmlTooltip = styled(Tooltip)(({ theme }) => ({
  "& .MuiTooltip-tooltip": {
    backgroundColor: `${theme.palette.background.paper} !important`,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: `${theme.palette.text.primary} !important`,
  },
  "& .MuiTooltip-arrow": {
    color: `${theme.palette.background.paper} !important`,
  },
}));

export default HtmlTooltip;
