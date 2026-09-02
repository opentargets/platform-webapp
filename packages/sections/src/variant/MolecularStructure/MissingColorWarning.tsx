
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { useViewerState, Box, Typography } from "ui";

function MissingColorWarning() {
  const viewerState = useViewerState();

  if (!(
      (viewerState.colorBy === "pathogenicity" && !viewerState.pathogenicityScores) ||
      (viewerState.colorBy === "domain" && !viewerState.domains)
    )) {
    return null;
  }
  
  return (
    <Box
      display="flex"
      flexDirection="column"
      p="0.6rem 0.8rem"
      bgcolor="#f8f8f8c8"
      sx={{ borderBottomRightRadius: "0.2rem" }}
      fontSize={14}
    >
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <FontAwesomeIcon icon={faTriangleExclamation} />
        <Typography variant="body2">
          {viewerState.colorBy === "pathogenicity"
            ? "Pathogenicity scores not available"
            : "Domain information not available"
          }
        </Typography>
      </Box>
    </Box>
  );
}

export default MissingColorWarning;