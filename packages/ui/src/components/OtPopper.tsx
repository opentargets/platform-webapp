import { Popper, styled } from "@mui/material";

const OtPopper = styled(Popper)(({ theme }) => ({
  // maxHeight: "60vh",
  borderRadius: 4,
  border: `1px solid ${theme.palette.grey[400]}`,
  background: "white",
  zIndex: "10000",
}));

export default OtPopper;
