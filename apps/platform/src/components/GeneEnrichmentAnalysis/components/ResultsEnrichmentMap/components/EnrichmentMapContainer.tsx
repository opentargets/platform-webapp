import { Box } from "@mui/material";
import { forwardRef } from "react";

export const EnrichmentMapContainer = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <Box
      ref={ref}
      sx={{
        width: "100%",
        height: "50vh",
        marginBottom: 2,
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        backgroundColor: "#fafafa",
        overflow: "hidden",
        position: "relative",
      }}
    />
  );
});


EnrichmentMapContainer.displayName = "EnrichmentMapContainer";
