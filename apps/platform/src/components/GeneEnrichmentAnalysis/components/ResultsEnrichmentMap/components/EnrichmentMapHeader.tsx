import { Box, Typography } from "@mui/material";
import type { Core as CytoscapeCore } from "cytoscape";
import type { ComputedStats } from "../utils";
import { ExportButtons } from "./ExportButtons";

interface EnrichmentMapHeaderProps {
  stats: ComputedStats;
  cyRef?: React.MutableRefObject<CytoscapeCore | null>;
}

export function EnrichmentMapHeader({ _, cyRef }: EnrichmentMapHeaderProps) {
  return (
    <Box>
      {cyRef && <Box sx={{ ml: "auto", mr: 2 }}><ExportButtons cyRef={cyRef} /></Box>}
    </Box>
  );
}
