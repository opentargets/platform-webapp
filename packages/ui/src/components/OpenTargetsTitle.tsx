import { Box, Typography } from "@mui/material";

import usePermissions from "../hooks/usePermissions";

type OpenTargetsTitleProps = {
  className?: string;
  name: string;
};

function OpenTargetsTitle({ className, name }: OpenTargetsTitleProps) {
  const { isPartnerPreview } = usePermissions();
  const displayedAppName = isPartnerPreview ? "Partner Preview Platform" : name;
  return (
    <Typography className={className} sx={{ display: "inline" }} variant="h6" color="inherit">
      <Box component="span" sx={{ fontWeight: 1100, textTransform: "capitalize" }}>
        Open Targets{" "}
      </Box>
      <Box component="span" sx={{ fontWeight: 300, textTransform: "capitalize" }}>
        {displayedAppName}
      </Box>
    </Typography>
  );
}

export default OpenTargetsTitle;
