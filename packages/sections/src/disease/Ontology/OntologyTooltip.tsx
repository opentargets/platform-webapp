import { MuiTooltip as MUITooltip } from "ui";
import { styled } from "@mui/material/styles";

const StyledTooltip = styled(MUITooltip)(({ theme }) => ({
  "& .MuiTooltip-tooltip": {
    backgroundColor: `${theme.palette.background.paper} !important`,
    border: `1px solid ${theme.palette.grey[300]}`,
    color: `${theme.palette.text.primary} !important`,
  },
}));

function OntologyTooltip({ children, title, placement = "top" }) {
  return (
    <StyledTooltip placement={placement} title={title}>
      {children}
    </StyledTooltip>
  );
}

export default OntologyTooltip;
