import { GridLegacy } from "@mui/material";
import { ReactNode } from "react";

type SectionContainerProps = {
  children: ReactNode;
};

function SectionContainer({ children }: SectionContainerProps): ReactNode {
  return (
    <GridLegacy id="summary-section" container spacing={2} style={{ marginTop: "20px" }}>
      {children}
    </GridLegacy>
  );
}

export default SectionContainer;
