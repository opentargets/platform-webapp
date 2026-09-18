import { Box } from "@mui/material";
import {
  GenomicLocationPresentationType,
  getGenomicLocation,
  type IGeneomicLocation,
} from "@ot/constants";
import type React from "react";
import { Chip, Tooltip } from "ui";

interface GenomicLocationProps {
  geneLoc: IGeneomicLocation;
  type?: GenomicLocationPresentationType;
  label?: string;
}

const GenomicLocation: React.FC<GenomicLocationProps> = ({
  geneLoc,
  type = GenomicLocationPresentationType.CHIP,
  label,
}) => {
  const [build, location] = getGenomicLocation(geneLoc);
  const tooltipTitle = label
    ? `${label}: build | chromosome:start-end,strand`
    : "build | chromosome:start-end,strand";

  if (type === GenomicLocationPresentationType.PLAIN) {
    return (
      <Box sx={{ mt: 1, typography: "body2" }} component="span">
        <Tooltip title={tooltipTitle}>
          <Box
            component="span"
            sx={{
              fontSize: "0.75rem",
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
    <Box sx={{ mt: 1, typography: "body2" }} component="span">
      {label && (
        <Box
          component="span"
          sx={{
            fontSize: "0.75rem",
            fontWeight: "bold",
            color: (theme) => theme.palette.grey[600],
            mr: "5px",
          }}
        >
          {label}:
        </Box>
      )}
      <Tooltip title={tooltipTitle}>
        <Box component="span" sx={{ display: "inline-flex", whiteSpace: "nowrap" }}>
          <Chip
            variant="filled"
            size="small"
            label={build}
            sx={{ borderRadius: "4px 0 0 4px" }}
          />
          <Chip
            variant="filled"
            size="small"
            label={location}
            sx={{ borderRadius: "0 4px 4px 0", ml: "1px" }}
          />
        </Box>
      </Tooltip>
    </Box>
  );
};

export default GenomicLocation;
