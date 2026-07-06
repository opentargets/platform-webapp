import { useState } from "react";
import { Box, Typography, Chip, Popover } from "@mui/material";
import { PRIORITISATION_COLORS } from "../../../utils/colorPalettes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHandPointer } from "@fortawesome/free-regular-svg-icons";
import { faComputerMouse, faInfoCircle } from "@fortawesome/free-solid-svg-icons";

interface EnrichmentMapLegendProps {
  nesRange?: { min: number; max: number };
}

export function EnrichmentMapLegend({ nesRange }: EnrichmentMapLegendProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const pathwayItems = (
    <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 3,
              px: 2,
              pt: 1.5,
            }}
          >
            {/* NES color scale */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                NES: {nesRange?.min.toFixed(2)}
              </Typography>
              <Box
                sx={{
                  width: 150,
                  height: 12,
                  background: `linear-gradient(to right, ${PRIORITISATION_COLORS[0]}, ${PRIORITISATION_COLORS[Math.floor(PRIORITISATION_COLORS.length / 2)]}, ${PRIORITISATION_COLORS[PRIORITISATION_COLORS.length - 1]})`,
                  borderRadius: 1,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {nesRange?.max.toFixed(2)}
              </Typography>
            </Box>
            {/* Separator */}
            <Box sx={{ width: "1px", height: 16, backgroundColor: "divider" }} />
            {/* Interaction hints */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <FontAwesomeIcon icon={faHandPointer} style={{ fontSize: "0.7rem", opacity: 0.5 }} />
                <Typography variant="caption" color="text.disabled">
                  Click Node or edge for details
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <FontAwesomeIcon icon={faComputerMouse} style={{ fontSize: "0.7rem", opacity: 0.5 }} />
                <Typography variant="caption" color="text.disabled">
                  Scroll to zoom
                </Typography>
                <Chip
                  icon={<FontAwesomeIcon icon={faInfoCircle} />}
                  label="About network view"
                  size="small"
                  color="primary"
                  onClick={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
                  sx={{
                    ml: 1,
                    cursor: "pointer",
                    height: 24,
                    fontSize: "0.7rem",
                  }}
                />
              </Box>
            </Box>
          </Box>
      
    </>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", gap: 3, mb: 2, flexWrap: "wrap" }}>
        {pathwayItems}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            maxWidth: 500,
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Network View Details
          </Typography>

          <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.6 }}>
            <strong>Force-directed graph</strong> where nodes are enriched pathways and edges represent gene overlap, so related gene sets cluster together.
          </Typography>

          <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
            Use this view to:
          </Typography>
          <Box sx={{ pl: 2, mb: 1.5 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Identify enriched functional themes
            </Typography>
            <Typography variant="body2" sx={{ mb: 0.5 }}>
              • Explore how pathways relate through shared genes
            </Typography>
            <Typography variant="body2">
              • Jump from a result back to disease evidence
            </Typography>
          </Box>

          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
            Edge weights:
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6, color: "text.secondary" }}>
            Edge thickness represents the overlap coefficient (Szymkiewicz–Simpson):{" "}
            <code style={{ backgroundColor: "#f5f5f5", padding: "2px 4px", borderRadius: "3px" }}>
              overlap(A, B) = |A ∩ B| / min(|A|, |B|)
            </code>
            {" "}which divides the genes shared by two gene sets by the size of the smaller set. Unlike the Jaccard index it is not penalised when one set is much larger than the other, so a small, specific pathway fully contained within a broad one still registers as highly similar, which suits the nested structure of pathway gene sets.
          </Typography>
        </Box>
      </Popover>
    </Box>
  );
}
