import { makeStyles } from "@mui/styles";
import { Box, CircularProgress, Fade } from "@mui/material";

type LoadingBackdropProps = {
  height?: number;
};

const useStyles = makeStyles(theme => ({
  container: {
    color: theme.palette.primary.main,
    background: theme.palette.grey["50"],
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    display: "flex",
  },
}));

function LoadingBackdrop({ height }: LoadingBackdropProps) {
  const classes = useStyles();
  const containerHeight = height ? `${height}px` : "auto";
  return (
    <Fade in timeout={300}>
      <Box className={classes.container} sx={{ height: containerHeight }}>
        <CircularProgress color="inherit" size={48} thickness={3.6} />
      </Box>
    </Fade>
  );
}

export default LoadingBackdrop;
