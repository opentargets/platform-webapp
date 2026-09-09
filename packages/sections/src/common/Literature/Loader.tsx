import { Box, Typography, CircularProgress } from "ui";
import { useEffect, useState } from "react";

function Loader({ message = "", pageSize = 5 }) {
  const [height, setHeight] = useState("4040px");

  useEffect(() => {
    if (pageSize === 5) setHeight("850px");
    else if (pageSize === 10) setHeight("1640px");
    else setHeight("4040px");
  }, [pageSize]);

  return (
    <Box
      height={height}
      display="flex"
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      <CircularProgress size={60} />
      <Box mt={6}>
        <Typography>{message}</Typography>
      </Box>
    </Box>
  );
}

export default Loader;
