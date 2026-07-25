import { Box, Grid } from "@mui/material";
import { ReactElement } from "react";

type PageProps = {
  children: ReactElement;
  footer: ReactElement;
  header: ReactElement;
};

function Page({ header, footer, children }: PageProps) {
  return (
    <Box
      sx={{
        background: "grey.50",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        margin: 0,
        width: "100%",
      }}
    >
      {header}
      <Grid
        container
        justifyContent="center"
        spacing={3}
        sx={{ margin: 0, padding: "24px", width: "100%", flex: "1 0 auto" }}
      >
        <Grid item xs={12} md={11} sx={{ pb: 3 }}>
          {children}
        </Grid>
      </Grid>
      {footer}
    </Box>
  );
}

export { Page };

export default Page;
