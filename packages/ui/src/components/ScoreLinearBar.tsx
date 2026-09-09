import { styled } from "@mui/material";
import LinearProgress, { linearProgressClasses } from "@mui/material/LinearProgress";

const ScoreLinearBar = styled(LinearProgress)(({ theme }) => ({
  height: 8,
  borderRadius: 5,
  width: 70,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.grey[200],
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    backgroundColor: theme.palette.primary.main,
  },
}));
export default ScoreLinearBar;
