import { faChartPie, faCircle, faSitemap, faTableColumns, faNetworkWired } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Alert, Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useState } from "react";
import type { GseaResult, InputOverlap } from "../api/gseaApi";
import ResultsPlotlySunburst from "./ResultsPlotlySunburst";
import { ResultsEnrichmentMap } from "./ResultsEnrichmentMap/";
import { EnrichmentMapControlsProvider } from "./ResultsEnrichmentMap/utils/EnrichmentMapControlsContext";
import ResultsTable from "./ResultsTable";
import ResultsTreeView from "./ResultsTreeView";
import PlotlySunburstChart from "./PlotlySunburstChart";

type ViewMode = "table" | "tree" | "plotly" | "network";

interface AnalysisResultsProps {
  results: GseaResult[];
  inputOverlap: InputOverlap | null;
  onReset: () => void;
  activeRunId?: string | null;
  diseaseId?: string;
}
const MIN_OVERLAP_COUNT = 25; // Minimum number of genes required for analysis
function AnalysisResults({ results, inputOverlap, onReset, activeRunId, diseaseId }: AnalysisResultsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  const handleViewChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode) {
      setViewMode(newMode);
    }
  };

  const significantCount = results.filter((r) => r.FDR < 0.05).length;
  const hasLessThanNormalGenes = inputOverlap && inputOverlap.used_count < MIN_OVERLAP_COUNT;

  return (
    <EnrichmentMapControlsProvider>
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", flex: 1 }}>
      {/* Fixed header */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography variant="h6">Analysis Complete</Typography>
          <Typography variant="body2" color="text.secondary">
            {results.length} enriched pathways ({significantCount} significant at FDR {"<"} 0.05)
            {inputOverlap && ` · ${inputOverlap.used_count} (${inputOverlap.used_percent}%) of ${inputOverlap.total_input} input genes used`}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <ToggleButtonGroup value={viewMode} exclusive onChange={handleViewChange} size="small">
            <ToggleButton value="table">
              <FontAwesomeIcon icon={faTableColumns} style={{ marginRight: 6 }} />
              Table
            </ToggleButton>
            <ToggleButton value="tree">
              <FontAwesomeIcon icon={faSitemap} style={{ marginRight: 6 }} />
              Tree view
            </ToggleButton>
            {/* <ToggleButton value="sunburst">
              <FontAwesomeIcon icon={faCircle} style={{ marginRight: 6 }} />
              Sunburst
            </ToggleButton> */}
            <ToggleButton value="plotly">
              <FontAwesomeIcon icon={faChartPie} style={{ marginRight: 6 }} />
              Sunburst
            </ToggleButton>
            <ToggleButton value="network">
              <FontAwesomeIcon icon={faNetworkWired} style={{ marginRight: 6 }} />
              Network
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      {hasLessThanNormalGenes && (
        <Alert severity="warning" sx={{m: 2}}>
          <Typography variant="body2">
            The number of input genes used for the analysis ({inputOverlap?.used_count}) is less than the recommended minimum ({MIN_OVERLAP_COUNT}). This may affect the reliability of the results.
          </Typography>
        </Alert>
      )}
      {/* Scrollable content */}
      <Box sx={{ flex: 1, overflow: "auto", p: ['network', 'plotly'].includes(viewMode) ? 0 : 2 }}>
        {viewMode === "table" && <ResultsTable results={results} />}
        {viewMode === "tree" && <PlotlySunburstChart results={results} />}
        {/* {viewMode === "sunburst" && <ResultsSunburst results={results} />} */}
        {viewMode === "plotly" && <ResultsPlotlySunburst key={activeRunId} results={results} />}
         {viewMode === "network" && <ResultsEnrichmentMap results={results} diseaseId={diseaseId} />}
      </Box>
    </Box>
    </EnrichmentMapControlsProvider>
  );
}

export default AnalysisResults;
