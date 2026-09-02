import { Box, Typography, CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { useEffect, useState } from "react";

const listComponentStyles = makeStyles(() => ({
  loader: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
}));

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
        <Typography className={listComponentStyles.AccordionSubtitle}>{message}</Typography>
      </Box>
    </Box>
  );
}

export default Loader;
