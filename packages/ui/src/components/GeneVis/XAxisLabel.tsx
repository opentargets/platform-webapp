import { Box, Typography } from "@mui/material";
import { infoStyle } from "./helpers";
import { useGenTrackState } from "../../providers/GenTrackProvider";

function XAxisLabel() { 
  const genTrackState = useGenTrackState(); 
  const { chromosome } = genTrackState;

  return (
    <Box sx={{ ...infoStyle, alignItems: "end", pr: 0.75 }}>
      <Typography component="div" variant="caption" sx={{ height: "10px", fontSize: "11px" }}>
        Chr {chromosome}
      </Typography>
    </Box>
  );
}

export default XAxisLabel;