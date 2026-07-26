import { Box, GridLegacy } from "@mui/material";
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
        backgroundColor: "grey.50",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        margin: 0,
        width: "100%",
      }}
    >
      {header}
      {/* NOTE: see packages/ui/src/pages/Page.tsx - the old JSS `margin: 0` rule here
          never actually beat MuiGrid-spacing-xs-3's own default negative margin.
          Omitted so the real historical margin applies. */}
      <GridLegacy
        container
        justifyContent="center"
        spacing={3}
        sx={{ padding: "24px", width: "100%", flex: "1 0 auto" }}
      >
        <GridLegacy item xs={12} md={11} sx={{ pb: 3 }}>
          {children}
        </GridLegacy>
      </GridLegacy>
      {footer}
    </Box>
  );
}

export { Page };

export default Page;
