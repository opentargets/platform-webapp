import { Popper as MuiPopper, styled } from "@mui/material";

const Popper = styled(MuiPopper)(({ theme }) => ({
  // maxHeight: "60vh",
  borderRadius: 4,
  border: `1px solid ${theme.palette.grey[400]}`,
  background: "white",
  zIndex: "10000",
}));

export default Popper;
