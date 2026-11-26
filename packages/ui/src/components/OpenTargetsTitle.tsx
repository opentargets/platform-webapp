import { Box, Typography } from "@mui/material";

import usePermissions from "../hooks/usePermissions";

type OpenTargetsTitleProps = {
  name: string;
};

function OpenTargetsTitle({ name }: OpenTargetsTitleProps) {
  const { isPartnerPreview } = usePermissions();
  const displayedAppName = isPartnerPreview ? "Partner Preview Platform" : name;
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", columnGap: 1, rowGap: 0.4 }}>
      <Typography variant="h6" sx={{ fontWeight: 1100, textTransform: "capitalize", lineHeight: 1 }}>
        Open Targets
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 300, textTransform: "capitalize", lineHeight: 1 }}>
         {displayedAppName}
      </Typography>
    </Box>
  );
}

export default OpenTargetsTitle;
