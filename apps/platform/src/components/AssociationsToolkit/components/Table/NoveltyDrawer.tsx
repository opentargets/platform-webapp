import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import { OverallChart, SourcesChart, useNoveltyTimeSeries } from "./NoveltyCharts";

export function NoveltyDrawer() {
  const { noveltyPanel, setNoveltyPanel } = useAotfURLState();
  const { id: parentId, entity, enableIndirect } = useAotfQueryState();
  const theme = useTheme();

  const open = !!noveltyPanel;
  const [, rowId] = noveltyPanel.split(":");

  const targetId = entity === "target" ? parentId : rowId;
  const diseaseId = entity === "target" ? rowId : parentId;

  const { overallRows, dsRows, dsLabels, loading, error, targetName, diseaseName } =
    useNoveltyTimeSeries({ targetId, diseaseId, isDirect: !enableIndirect, skip: !open });

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
    <Drawer
      anchor="right"
      open={open}
      onClose={() => setNoveltyPanel("")}
      transitionDuration={{ enter: 350, exit: 280 }}
      ModalProps={{ keepMounted: true }}
      PaperProps={{
        sx: { width: 600, p: 3, display: "flex", flexDirection: "column", gap: 2, overflowX: "hidden" },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
            Novelty Trend
          </Typography>
          {targetName && diseaseName && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {targetName} · {diseaseName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={() => setNoveltyPanel("")} size="small" aria-label="close" sx={{ mt: -0.5 }}>
          <FontAwesomeIcon icon={faXmark} />
        </IconButton>
      </Box>

      {/* Help text */}
      <Typography variant="body2" color="text.secondary">
        Novelty scores how recently discovered the evidence for this association is — from
        0 (well-established) to 1 (newly emerging). The overall score aggregates across all
        data sources; the breakdown below shows each source's individual contribution over time.
      </Typography>

      <Divider />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Typography color="error" variant="body2">
          Failed to load: {error.message}
        </Typography>
      )}

      {!loading && !error && (overallRows.length > 0 || dsRows.length > 0) && (
        <>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Overall</Typography>
            <OverallChart
              rows={overallRows}

              color={theme.palette.primary.main}
              height={140}
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>By data source</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
              Click a source to show or hide its line
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
              {dsLabels.map(label => (
                <Chip
                  key={label}
                  label={label}
                  size="small"
                  onClick={() => toggleLabel(label)}
                  variant={selectedLabels.has(label) ? "filled" : "outlined"}
                  sx={{ transition: "all 150ms ease" }}
                />
              ))}
            </Box>
            <SourcesChart
              rows={filteredDsRows}
              dsLabels={dsLabels}

              height={300}
            />
          </Box>
        </>
      )}
    </Drawer>
  );
}
