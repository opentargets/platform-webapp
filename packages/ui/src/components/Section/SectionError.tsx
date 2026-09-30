import { Typography } from "@mui/material";
import type { ReactNode } from "react";

type SectionErrorProps = {
  message: string;
};

function SectionError({ message }: SectionErrorProps): ReactNode {
  return (
    <Typography color="error" align="center">
      {message}
    </Typography>
  );
}

export default SectionError;
