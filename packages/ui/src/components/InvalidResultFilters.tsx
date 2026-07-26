import { faFilterCircleXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Typography } from "@mui/material";

function InvalidResultFilters() {
  return (
    <Box
      sx={{
        width: "auto",
        px: 5,
        py: 6,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          borderRadius: "50%",
          backgroundColor: theme => theme.palette.grey[300],
          display: "flex",
          width: "100px",
          height: "100px",
          justifyContent: "center",
          alignItems: "center",
          mb: 2,
        }}
      >
        <FontAwesomeIcon size="3x" icon={faFilterCircleXmark} />
      </Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        No results found
      </Typography>
      <Typography variant="body2">
        Try adjust your search or filter to find what you looking for.
      </Typography>
    </Box>
  );
}
export default InvalidResultFilters;
