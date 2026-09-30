import { Box, Typography } from "@mui/material";
import ColorRamp from "../ColorRamp";

function CompactAlphaFoldHydrophobicityLegend({ colorInterpolator }) {
  return (
    <Box sx={{ display: "flex", gap: 1, justifyContent: "end", alignItems: "center", mt: 0.4 }}>
      <Typography variant="caption">hydrophilic</Typography>
      <Box sx={{ display: "flex", gap: 0.4, alignItems: "end" }}>
        <ColorRamp interpolator={colorInterpolator} />
      </Box>
      <Typography variant="caption">hydrophobic</Typography>
    </Box>
  );
}

export default CompactAlphaFoldHydrophobicityLegend;
