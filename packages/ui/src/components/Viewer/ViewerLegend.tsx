import { Box, Typography } from "@mui/material";
import { useViewerState } from "ui";
import { domainColors, hydrophobicityColorInterpolator } from "ui/src/components/Viewer/helpers";
import CompactAlphaFoldDomainLegend from "./CompactAlphaFoldDomainLegend";
import CompactAlphaFoldHydrophobicityLegend from "./CompactAlphaFoldHydrophobicityLegend";
import CompactAlphaFoldLegend from "./CompactAlphaFoldLegend";
import CompactAlphaFoldPathogenicityLegend from "./CompactAlphaFoldPathogenicityLegend";

function ViewerLegend() {
  // these value are used if there is no viewer state (i.e. not in side a viewerProvider)
  let colorBy = "confidence";
  let pathogenicityScores;
  let domains;

  const viewerState = useViewerState();
  if (viewerState) {
    ({ colorBy, pathogenicityScores, domains } = viewerState);
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      {/* explanatory text */}
      {colorBy === "pathogenicity" && pathogenicityScores && (
        <Typography variant="caption" sx={{ pl: 0.4 }}>
          Mean AlphaMissense pathogenicity over possible amino acid substitutions
        </Typography>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "end",
          alignItems: "center",
          flexWrap: "wrap",
          ml: { xs: 1, lg: 0 },
        }}
      >
        <Box>
          {colorBy === "confidence" ? (
            <CompactAlphaFoldLegend showTitle={!viewerState} />
          ) : colorBy === "pathogenicity" && pathogenicityScores ? (
            <CompactAlphaFoldPathogenicityLegend showTitle={false} />
          ) : colorBy === "domain" && domains ? (
            <CompactAlphaFoldDomainLegend domains={domains} colorScheme={domainColors} />
          ) : colorBy === "hydrophobicity" ? (
            <CompactAlphaFoldHydrophobicityLegend
              colorInterpolator={hydrophobicityColorInterpolator}
            />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}

export default ViewerLegend;
