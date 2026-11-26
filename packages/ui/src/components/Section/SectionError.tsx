import { Typography } from "@mui/material";
import type { ReactNode } from "react";

type SectionErrorProps = {
  message?: string;
  error?: unknown;
};

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
    return error.message;
  return "This section could not be loaded.";
}

function SectionError({ message, error }: SectionErrorProps): ReactNode {
  return (
    <Typography color="error" align="center" data-testid="section-error" role="alert">
      {message ?? errorMessage(error)}
    </Typography>
  );
}

export default SectionError;
