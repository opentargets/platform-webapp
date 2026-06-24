import { useEffect, useState } from "react";
import { Box, Chip, CircularProgress, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { grey } from "@mui/material/colors";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine } from "@fortawesome/free-solid-svg-icons";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";
import { OverallChart, SourcesChart, useNoveltyTimeSeries } from "./NoveltyCharts";

const CHART_HEIGHT = 150;

interface NoveltyInlinePanelProps {
  rowId: string;
}

export function NoveltyInlinePanel({ rowId }: NoveltyInlinePanelProps) {
  const { id: parentId, entity, enableIndirect } = useAotfQueryState();
  const theme = useTheme();

  const targetId = entity === "target" ? parentId : rowId;
  const diseaseId = entity === "target" ? rowId : parentId;

  const { overallRows, dsRows, dsLabels, loading, error, targetName, diseaseName } =
    useNoveltyTimeSeries({ targetId, diseaseId, isDirect: !enableIndirect, skip: false });

  const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
  useEffect(() => {
    setSelectedLabels(new Set(dsLabels));
  }, [dsLabels.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleLabel = (label: string) => {
    setSelectedLabels(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const filteredDsRows = dsRows.filter(r => selectedLabels.has(r.label));

  return (
    <Box sx={{ background: grey[100], px: 3, pt: 2, pb: 2 }}>
      {/* Title */}
      <Box
        sx={{
          boxSizing: "border-box",
          alignItems: "center",
          display: "flex",
          position: "relative",
          mb: 2,
        }}
      >
        <Box
          sx={{
            height: "45px",
            width: "35px",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mr: 1,
          }}
        >
          <FontAwesomeIcon icon={faChartLine} />
        </Box>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography variant="controlHeader">Novelty Trend</Typography>
          {targetName && diseaseName && (
            <Typography variant="body2" color="text.secondary">
              {targetName} · {diseaseName}
            </Typography>
          )}
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && (
        <Typography color="error" variant="caption">
          Failed to load: {error.message}
        </Typography>
      )}

      {!loading && !error && (overallRows.length > 0 || dsRows.length > 0) && (
        <Box sx={{ display: "flex", gap: 0 }}>

          {/* Overall — 50%, flex column so chart snaps to bottom */}
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
              Overall
            </Typography>
            <Box sx={{ mt: "auto" }}>
              <OverallChart
                rows={overallRows}
  
                color={theme.palette.primary.main}
                height={CHART_HEIGHT}
                plotWidth={500}
                showArea={false}
              />
            </Box>
          </Box>

          <Box sx={{ width: "1px", background: grey[300], mx: 2, flexShrink: 0 }} />

          {/* By data source — 50%, flex column so chart snaps to bottom */}
          <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <Box>
              <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  By data source
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  · click to toggle
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.75 }}>
                {dsLabels.map(label => (
                  <Chip
                    key={label}
                    label={label}
                    size="small"
                    onClick={() => toggleLabel(label)}
                    variant={selectedLabels.has(label) ? "filled" : "outlined"}
                    sx={{ fontSize: 11, height: 20, transition: "all 150ms ease" }}
                  />
                ))}
              </Box>
            </Box>
            <Box sx={{ mt: "auto" }}>
              <SourcesChart
                rows={filteredDsRows}
                dsLabels={dsLabels}
  
                height={CHART_HEIGHT}
                plotWidth={500}
                showLegend={false}
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
