import { Box } from "@mui/material";
import type { ReactNode } from "react";

type PlotContainerSectionProps = {
  children: ReactNode;
};

function PlotContainerSection({ children }: PlotContainerSectionProps): ReactNode {
  return (
    <Box sx={{ padding: "4px 0", borderBottom: (theme) => `1px solid ${theme.palette.grey[300]}` }}>
      {children}
    </Box>
  );
}

export default PlotContainerSection;
