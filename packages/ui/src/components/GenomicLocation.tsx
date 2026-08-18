import { Box } from "@mui/material";
import {
  GenomicLocationPresentationType,
  getGenomicLocation,
  type IGeneomicLocation,
} from "@ot/constants";
import type React from "react";
import { Tooltip } from "ui";

interface GenomicLocationProps {
  geneLoc: IGeneomicLocation;
  type?: GenomicLocationPresentationType;
}

const GenomicLocation: React.FC<GenomicLocationProps> = ({
  geneLoc,
  type = GenomicLocationPresentationType.CHIP,
}) => {
  const [build, location] = getGenomicLocation(geneLoc);

  if (type === GenomicLocationPresentationType.PLAIN) {
    return (
      <Box sx={{ mt: 1, typography: "body2" }} component="span">
        <Tooltip title="build | chromosome:start-end,strand">
          <Box
            component="span"
            sx={{
              fontSize: "0.875rem",
              fontWeight: "bold",
              color: (theme) => theme.palette.grey[600],
            }}
          >
            {build} | {location}
          </Box>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box sx={{ typography: "body2" }} component="span">
      <Tooltip title="build | chromosome:start-end,strand">
        <Box component="span" sx={{ display: "inline-flex", alignItems: "center" }}>
          <Box
            component="span"
            sx={{
              whiteSpace: "nowrap",
              bgcolor: (theme) => theme.palette.grey[300],
              border: (theme) => `1px solid ${theme.palette.grey[300]}`,
              px: "8px",
              py: "2px",
              color: (theme) => theme.palette.grey[700],
              fontSize: "0.875rem",
              borderRadius: (theme) => `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
            }}
          >
            {build}
          </Box>
          <Box
            component="span"
            sx={{
              whiteSpace: "nowrap",
              border: (theme) => `1px solid ${theme.palette.grey[300]}`,
              borderLeft: "none",
              px: "8px",
              py: "2px",
              color: (theme) => theme.palette.grey[700],
              fontSize: "0.875rem",
              borderRadius: (theme) => `0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0`,
            }}
          >
            {location}
          </Box>
        </Box>
      </Tooltip>
    </Box>
  );
};

export default GenomicLocation;
