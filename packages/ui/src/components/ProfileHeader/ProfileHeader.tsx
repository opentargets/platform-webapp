import { Children } from "react";
import { Grid } from "@mui/material";
import { styled } from "@mui/material/styles";

const StyledSection = styled(Grid)({
  marginBottom: "5px !important",
});

function ProfileHeader({ children }) {
  return (
    <Grid data-testid="profile-header" sx={{ marginTop: ".5rem !important" }} container spacing={2}>
      {Children.map(children, child => (
        <StyledSection item xs={12} md={6}>
          {child}
        </StyledSection>
      ))}
    </Grid>
  );
}

export default ProfileHeader;
