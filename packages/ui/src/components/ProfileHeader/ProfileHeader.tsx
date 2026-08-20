import { Children } from "react";
import { GridLegacy } from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledSection = styled(GridLegacy)({
  marginBottom: "5px !important",
});

function ProfileHeader({ children }) {
  return (
    <GridLegacy data-testid="profile-header" sx={{ marginTop: ".5rem !important" }} container spacing={2}>
      {Children.map(children, child => (
        <StyledSection item xs={12} md={6}>
          {child}
        </StyledSection>
      ))}
    </GridLegacy>
  );
}

export default ProfileHeader;
