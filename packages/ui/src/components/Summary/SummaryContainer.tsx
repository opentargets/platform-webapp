import { GridLegacy, styled } from "@mui/material";

const StyledGrid = styled(GridLegacy)({
  marginBottom: "2rem",
  marginTop: "2rem !important",
});

function SummaryContainer({ children }) {
  return (
    <StyledGrid id="summary-section" container spacing={1}>
      {children}
    </StyledGrid>
  );
}

export default SummaryContainer;
