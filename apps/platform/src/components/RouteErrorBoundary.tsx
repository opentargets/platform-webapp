import { Box, Typography, MuiButton as Button } from "ui";
import { useRouteError } from "react-router";

function RouteErrorBoundary() {
  const error = useRouteError();
  // eslint-disable-next-line no-console
  console.error(error);

  return (
    <Box
      sx={{
        minHeight: "500px",
        height: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        textAlign: "center",
      }}
    >
      <Typography variant="h4" color="primary.main" fontWeight={700}>
        Something went wrong
      </Typography>
      <Typography>We couldn't load this page. Please try again.</Typography>
      <Button href="/" variant="contained" color="primary">
        Go back to Home Page
      </Button>
    </Box>
  );
}

export default RouteErrorBoundary;
