import React from "react";
import { Box } from "@mui/material";
import { GenomicLocationPresentationType, getGenomicLocation, IGeneomicLocation } from "@ot/constants";
import {  Tooltip } from "ui"



interface GenomicLocationProps {
  geneLoc: IGeneomicLocation;
  type?: GenomicLocationPresentationType;
}

const GenomicLocation: React.FC<GenomicLocationProps> = ({ geneLoc, type = GenomicLocationPresentationType.CHIP }) => {
    const [build, location] = getGenomicLocation(geneLoc);

    if(type === GenomicLocationPresentationType.PLAIN || type === GenomicLocationPresentationType.BODY) {
        return (
            <Box sx={{ ...(type === GenomicLocationPresentationType.PLAIN && { mt: 1 }), typography: "body2" }} component="span">
                 <Tooltip title="build | chromosome:start-end,strand">
                     <Box
                        component="span"
                        sx={{
                        ...(type === GenomicLocationPresentationType.PLAIN && {
                            fontSize: "0.75rem",
                            color: theme => theme.palette.grey[600],
                        }),
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
            <Tooltip title="build | chromosome:start-end,strand">
              <Box
                component="span"
                sx={{
                  whiteSpace: "nowrap",
                  background: theme => theme.palette.grey[600],
                  border: theme => `1px solid ${theme.palette.grey[600]}`,
                  p: "1px 5px",
                  color: "white",
                  borderRadius: "5px 0 0 5px",
                }}
              >
                {build}
              </Box>
              <Box
                component="span"
                sx={{
                  whiteSpace: "nowrap",
                  p: "1px 5px",
                  color: theme => theme.palette.grey[600],
                  border: theme => `1px solid ${theme.palette.grey[600]}`,
                  borderRadius: "0 5px 5px 0",
                }}
              >
                {location}
              </Box>
            </Tooltip>
        </Box>
  );
};

export default GenomicLocation;
