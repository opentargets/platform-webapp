import { Grid, styled } from "@mui/material";

const StyledGrid = styled(Grid)({
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
