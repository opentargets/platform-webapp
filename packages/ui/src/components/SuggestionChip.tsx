import { Chip } from "@mui/material";
import { grey } from "@mui/material/colors";
import { styled } from "@mui/material/styles";

export const StyledChip = styled(Chip)(({ theme }) => ({
  border: 1,
  fontSize: "12px",
  fontWeight: "bold",
  boxShadow: 0,
  "&:hover": {
    color: theme.palette.primary.dark,
    background: grey[100],
  },
  "&:hover .MuiChip-icon": {
    color: theme.palette.primary.dark,
  },
}));
