import { Box, CircularProgress, Fade } from "@mui/material";

type LoadingBackdropProps = {
  height?: number;
};

function LoadingBackdrop({ height }: LoadingBackdropProps) {
  const containerHeight = height ? `${height}px` : "auto";
  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          color: "primary.main",
          background: theme => theme.palette.grey["50"],
          width: "100%",
          justifyContent: "center",
          alignItems: "center",
          display: "flex",
          height: containerHeight,
        }}
      >
        <CircularProgress color="inherit" size={48} thickness={3.6} />
      </Box>
    </Fade>
  );
}

export default LoadingBackdrop;
