import { Box, Skeleton, Typography } from "@mui/material";
import type { ReactNode } from "react";
import LongText from "../LongText";

type DescriptionProps = {
  children?: ReactNode;
  loading?: boolean;
};

function Description({ children, loading = false }: DescriptionProps): ReactNode {
  const content = children ? (
    <LongText lineLimit={3} variant="body2">
      {children}
    </LongText>
  ) : (
    "No description available"
  );

  return (
    <Box data-testid="profile-description">
      <Typography variant="subtitle2">Description</Typography>
      {loading ? <Skeleton height="5rem" /> : content}
    </Box>
  );
}

export default Description;
