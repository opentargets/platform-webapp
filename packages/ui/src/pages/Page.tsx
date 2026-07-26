import { Box, GridLegacy } from "@mui/material";
import { ReactNode } from "react";

type PageProps = {
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

function Page({ header, footer, children }: PageProps): ReactNode {
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
      {/* NOTE: the old JSS `gridContainer.margin: 0` rule never actually beat
          MuiGrid-spacing-xs-3's own default negative margin (JSS vs. MUI's own
          emotion-injected defaults - same cross-engine specificity issue documented
          elsewhere in this migration). Omitted here so the real historical margin
          (MUI's own spacing-driven negative margin) applies, rather than the
          never-applied "margin: 0" intent. */}
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

export default Page;
