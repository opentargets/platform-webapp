import { useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  faPlus,
  faChevronLeft,
  faChevronRight,
  faCheck,
  faExclamationTriangle,
  faSpinner,
  faTriangleExclamation,
  faFlask,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { AnalysisRun, AssociationsState } from "../types";

interface RunHistorySidebarProps {
  runs: AnalysisRun[];
  activeRunId: string | null;
  currentAssociationsState: AssociationsState;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectRun: (runId: string | null) => void;
  onDeleteRun: (runId: string) => void;
  onNewAnalysis: () => void;
}

/** Check if the current AOTF state differs from the run's snapshot */
function isRunStale(run: AnalysisRun, currentState: AssociationsState): boolean {
  // Compare key fields that affect the gene list
  if (run.efoId !== currentState.efoId) return true;
  if (run.inputs.geneSetSource === "uploaded" || run.inputs.geneSetSource === "pinned") {
    // For uploaded/pinned, check if those lists changed
    if (run.inputs.geneSetSource === "uploaded") {
      const runUploaded = JSON.stringify([...currentState.uploadedEntities].sort());
      const currentUploaded = JSON.stringify([...currentState.uploadedEntities].sort());
      if (runUploaded !== currentUploaded) return true;
    }
    if (run.inputs.geneSetSource === "pinned") {
      const runPinned = JSON.stringify([...currentState.pinnedEntities].sort());
      const currentPinned = JSON.stringify([...currentState.pinnedEntities].sort());
      if (runPinned !== currentPinned) return true;
    }
  }
  // For "all" gene set source, check if filters changed
  if (JSON.stringify(currentState.datasources) !== JSON.stringify(currentState.datasources)) return true;
  if (currentState.enableIndirect !== currentState.enableIndirect) return true;

  return false;
}

/** Format timestamp as relative time */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

const LIBRARY_DISPLAY_NAMES: Record<string, string> = {
  ReactomePathways_2025: "Reactome 2025",
  "GO:BP_2025": "Gene Ontology (Biological Process) 2025",
  "GO:CC_2025": "Gene Ontology (Cellular Component) 2025",
  "GO:MF_2025": "Gene Ontology (Molecular Function) 2025",
};

/** Get library display name (extract last part of path) */
function getLibraryDisplayName(library: string): string {
  const parts = library.split("/");
  const rawName = parts[parts.length - 1] || library;
  return LIBRARY_DISPLAY_NAMES[rawName] ?? rawName;
}

function RunHistorySidebar({
  runs,
  activeRunId,
  currentAssociationsState,
  collapsed,
  onToggleCollapse,
  onSelectRun,
  onDeleteRun,
  onNewAnalysis,
}: RunHistorySidebarProps) {
  // Sort runs by timestamp (newest first)
  const sortedRuns = useMemo(() => {
    return [...runs].sort((a, b) => b.timestamp - a.timestamp);
  }, [runs]);

  const sidebarWidth = collapsed ? 56 : 280;

  return (
    <Box
      sx={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        borderRight: "1px solid",
        borderColor: "divider",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease-in-out, min-width 0.2s ease-in-out",
        overflow: "hidden",
      }}
    >
      {/* Header with collapse toggle */}
      <Box
        sx={{
          p: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: 48,
        }}
      >
        {!collapsed && (
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Run History
          </Typography>
        )}
        <Tooltip title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <IconButton size="small" onClick={onToggleCollapse}>
            <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* New Analysis Button */}
      <Box sx={{ p: collapsed ? 0.5 : 1.5 }}>
        {collapsed ? (
          <Tooltip title="New Analysis" placement="right">
            <IconButton
              color="primary"
              onClick={onNewAnalysis}
              sx={{
                width: "100%",
                borderRadius: 1,
                border: "1px dashed",
                borderColor: "primary.main",
              }}
            >
              <FontAwesomeIcon icon={faPlus} />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<FontAwesomeIcon icon={faPlus} />}
            onClick={onNewAnalysis}
            sx={{ borderStyle: "dashed" }}
          >
            New Analysis
          </Button>
        )}
      </Box>

      <Divider />

      {/* Run List */}
      <Box sx={{ flex: 1, overflow: "auto" }}>
        {sortedRuns.length === 0 ? (
          <Box sx={{ p: 2, textAlign: "center" }}>
            {!collapsed && (
              <Typography variant="body2" color="text.secondary">
                No previous runs
              </Typography>
            )}
          </Box>
        ) : (
          <List dense disablePadding>
            {sortedRuns.map((run) => {
              const isActive = run.id === activeRunId;
              const isStale = isRunStale(run, currentAssociationsState);
              const isRunning = run.status === "pending" || run.status === "fetching_associations" || run.status === "running_gsea";
              const isError = run.status === "error";
              const isComplete = run.status === "complete";

              if (collapsed) {
                // Collapsed view - just icons
                return (
                  <Tooltip
                    key={run.id}
                    title={
                      <Box>
                        <div>{getLibraryDisplayName(run.inputs.selectedLibrary)}</div>
                        <div>{formatTimeAgo(run.timestamp)}</div>
                        {isComplete && <div>{run.results.length} pathways</div>}
                        {isStale && <div>⚠ Settings changed</div>}
                        {isError && <div>Error: {run.error}</div>}
                      </Box>
                    }
                    placement="right"
                  >
                    <ListItemButton
                      disableRipple
                      selected={isActive}
                      onClick={() => onSelectRun(run.id)}
                      sx={{
                        justifyContent: "center",
                        py: 1.5,
                        borderLeft: isActive ? "3px solid" : "3px solid transparent",
                        borderColor: isActive ? "primary.main" : "transparent",
                      }}
                    >
                      {isRunning ? (
                        <CircularProgress size={16} />
                      ) : isError ? (
                        <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: "#d32f2f" }} />
                      ) : isStale ? (
                        <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: "#ed6c02" }} />
                      ) : (
                        <FontAwesomeIcon icon={faFlask} style={{ color: isActive ? "#1976d2" : "#757575" }} />
                      )}
                    </ListItemButton>
                  </Tooltip>
                );
              }

              // Expanded view
              return (
                <ListItem
                  key={run.id}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRun(run.id);
                      }}
                      sx={{ opacity: 0.5, "&:hover": { opacity: 1 } }}
                    >
                      <FontAwesomeIcon icon={faTrash} size="sm" />
                    </IconButton>
                  }
                >
                  <ListItemButton
                    disableRipple
                    selected={isActive}
                    onClick={() => onSelectRun(run.id)}
                    sx={{
                      borderLeft: isActive ? "3px solid" : "3px solid transparent",
                      borderColor: isActive ? "primary.main" : "transparent",
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: isActive ? 600 : 400 }}>
                            {getLibraryDisplayName(run.inputs.selectedLibrary)}
                          </Typography>
                          {isRunning && <CircularProgress size={12} />}
                          {isError && (
                            <Tooltip title={run.error || "Error"}>
                              <Box component="span">
                                <FontAwesomeIcon icon={faExclamationTriangle} style={{ color: "#d32f2f", fontSize: "0.75rem" }} />
                              </Box>
                            </Tooltip>
                          )}
                          {isComplete && !isStale && (
                            <FontAwesomeIcon icon={faCheck} style={{ color: "#4caf50", fontSize: "0.75rem" }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(run.timestamp)}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            {isComplete && (
                              <Chip
                                label={`${run.results.length} pathways`}
                                size="small"
                                sx={{ height: 18, fontSize: "0.65rem" }}
                              />
                            )}
                            {isStale && (
                              <Chip
                                label="Stale"
                                size="small"
                                color="warning"
                                variant="outlined"
                                sx={{ height: 18, fontSize: "0.65rem" }}
                                icon={<FontAwesomeIcon icon={faTriangleExclamation} style={{ fontSize: "0.6rem" }} />}
                              />
                            )}
                          </Box>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
}

export default RunHistorySidebar;
