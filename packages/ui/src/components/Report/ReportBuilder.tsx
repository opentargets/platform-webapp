import React, { useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Chip,
  Divider,
  Tooltip,
  Avatar,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faX,
  faTrash,
  faGrip,
  faDownload,
  faPen,
  faBroom,
} from "@fortawesome/free-solid-svg-icons";
import {
  useDraggable,
  useDroppable,
  DragDropProvider,
} from "@dnd-kit/react";
import {
  arrayMove,
} from "@dnd-kit/sortable";
import { useReportBuilder } from "../../providers/ReportBuilderProvider";
import { ReportSectionContext } from "../../providers/ReportSectionContext";
import { ReportSection } from "../../types/report";
import { useReportSectionContent } from "../../hooks/useReportSectionRenderer";

/**
 * Draggable Report Section Component
 */
const DraggableReportSection: React.FC<{
  section: ReportSection;
  onRemove: (sectionId: string) => void;
  onViewChange: (sectionId: string, view: "table" | "chart") => void;
}> = ({ section, onRemove }) => {
  const { ref } = useDraggable({
    id: section.reportSectionId,
  });

  const content = useReportSectionContent(section);
  const hasContent = !!(content.body && content.description);

  console.log(section, section.selectedView, content.body, content.chart, 'rendering DraggableReportSection');

  return (
    <Card
      ref={ref}
      sx={{
        mb: 2,
        border: "1px solid #e0e0e0",
        transition: "all 0.2s ease",
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
      }}
      elevation={1}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          {/* Drag Handle */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              color: "text.secondary",
              mt: 0.5,
            }}
          >
            <FontAwesomeIcon icon={faGrip} />
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: "0.75rem",
                  backgroundColor: "primary.main",
                }}
              >
                {section.definition.shortName || section.definition.name.charAt(0)}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {section.definition.name}
              </Typography>
              {section.definition.isPrivate && (
                <Chip label="Private" size="small" variant="outlined" />
              )}
              {section.chipText && (
                <Chip label={section.chipText} size="small" />
              )}
            </Box>

            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              {content.description || (
                <em style={{ color: "#999" }}>
                  Description not available (navigate to page to load)
                </em>
              )}
            </Typography>

            {/* Rendered Content Preview */}
            <Box
              sx={{
                backgroundColor: "#f5f5f5",
                p: 2,
                mb: 2,
                border: "1px solid #e0e0e0",
                borderRadius: 1,
                minHeight: 200,
                "& > div, & > table, & > svg, & > canvas": {
                  width: "100%",
                  height: "auto",
                },
              }}
            >
              <ReportSectionContext.Provider 
                value={{ 
                  entityId: section.entityId, 
                  entityLabel: section.entityLabel, 
                  entityType: section.definition.entity 
                }}
              >
                {content.body || content.chart}
              </ReportSectionContext.Provider>
              {!hasContent && (
                <Box sx={{ textAlign: "center", color: "#999", py: 4 }}>
                  <Typography variant="body2">
                    Content not available
                  </Typography>
                  <Typography variant="caption">
                    Navigate to the {section.definition.entity} page to load section content
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Controls */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={section.selectedView.toUpperCase()}
                size="small"
                variant="outlined"
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Added {new Date(section.addedAt).toLocaleDateString()}
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Remove from report">
                <IconButton
                  size="small"
                  onClick={() => onRemove(section.reportSectionId)}
                  sx={{ color: "error.main" }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Droppable sections container
 */
const DroppableSectionsList: React.FC<{
  sections: ReportSection[];
  onRemove: (sectionId: string) => void;
  onViewChange: (sectionId: string, view: "table" | "chart") => void;
}> = ({ sections, onRemove, onViewChange }) => {
  const { ref } = useDroppable({
    id: "report-sections",
  });

  return (
    <Box ref={ref}>
      {sections.map((section) => (
        <DraggableReportSection
          key={section.reportSectionId}
          section={section}
          onRemove={onRemove}
          onViewChange={onViewChange}
        />
      ))}
    </Box>
  );
};

/**
 * Main Report Builder Component
 */
interface ReportBuilderProps {
  drawerWidth?: number | string;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ drawerWidth = "90vw" }) => {
  const { state, dispatch, activeReport } = useReportBuilder();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [currentTab, setCurrentTab] = useState(0);

  if (!state.isBuilderOpen) {
    return null;
  }

  const handleCloseBuilder = () => {
    dispatch({
      type: "toggleBuilderOpen",
      isOpen: false,
    });
  };

  const handleOpenEditDialog = () => {
    if (activeReport) {
      setEditName(activeReport.name);
      setEditDescription(activeReport.description || "");
      setEditDialogOpen(true);
    }
  };

  const handleSaveEdit = () => {
    if (activeReport && editName.trim()) {
      dispatch({
        type: "renameReport",
        reportId: activeReport.id,
        newName: editName,
      });
      setEditDialogOpen(false);
    }
  };

  const handleClearReport = () => {
    if (activeReport && window.confirm(`Clear all sections from "${activeReport.name}"?`)) {
      dispatch({
        type: "clearReport",
      });
    }
  };

  const handleDeleteReport = () => {
    if (
      activeReport &&
      window.confirm(
        `Delete "${activeReport.name}" and all its sections? This cannot be undone.`
      )
    ) {
      dispatch({
        type: "deleteReport",
        reportId: activeReport.id,
      });
    }
  };

  const handleExportReport = () => {
    if (activeReport) {
      const exportData = {
        report: {
          name: activeReport.name,
          description: activeReport.description,
          createdAt: activeReport.createdAt,
          sections: activeReport.sections.map((s) => ({
            name: s.definition.name,
            entity: s.definition.entity,
            selectedView: s.selectedView,
            addedAt: s.addedAt,
          })),
        },
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeReport.name.replace(/\s+/g, "-")}-report.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={state.isBuilderOpen}
      onClose={handleCloseBuilder}
      sx={{
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxShadow: "-2px 0 8px rgba(0, 0, 0, 0.15)",
        },
      }}
    >
      <DragDropProvider
        onDragEnd={(event) => {
          if (event.canceled) return;

          const { source, target } = event.operation;

          if (target && source && source.id !== target.id && activeReport) {
            const oldIndex = activeReport.sections.findIndex(
              (s) => s.reportSectionId === String(source.id)
            );
            const newIndex = activeReport.sections.findIndex(
              (s) => s.reportSectionId === String(target.id)
            );

            if (oldIndex !== -1 && newIndex !== -1) {
              const newOrder = arrayMove(activeReport.sections, oldIndex, newIndex);
              dispatch({
                type: "reorderSections",
                newOrder,
              });
            }
          }
        }}
      >
        <AppBar position="relative" elevation={1}>
          <Toolbar>
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 600 }}>
              Report Builder
            </Typography>
            <IconButton color="inherit" onClick={handleCloseBuilder}>
              <FontAwesomeIcon icon={faX} />
            </IconButton>
          </Toolbar>
        </AppBar>

      {/* Tab Navigation for multiple reports */}
      {state.reports.size > 0 && (
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: "1px solid #e0e0e0",
          }}
        >
          {Array.from(state.reports.values()).map((report) => (
            <Tab
              key={report.id}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {report.name}
                  <Chip label={report.sections.length} size="small" />
                </Box>
              }
              onClick={() => {
                dispatch({
                  type: "setActiveReport",
                  reportId: report.id,
                });
              }}
            />
          ))}
        </Tabs>
      )}

      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {!activeReport ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No active report
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Create a new report or select one from above
            </Typography>
          </Box>
        ) : (
          <>
            {/* Report Header */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, wordBreak: "break-word" }}>
                    {activeReport.name}
                  </Typography>
                  {activeReport.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {activeReport.description}
                    </Typography>
                  )}
                </Box>
                <Tooltip title="Edit report">
                  <IconButton size="small" onClick={handleOpenEditDialog}>
                    <FontAwesomeIcon icon={faPen} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography variant="caption" color="text.secondary">
                {activeReport.sections.length} section{activeReport.sections.length !== 1 ? "s" : ""}
              </Typography>

              <Divider sx={{ my: 1.5 }} />

              {/* Action Buttons */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FontAwesomeIcon icon={faDownload} />}
                  onClick={handleExportReport}
                >
                  Export
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FontAwesomeIcon icon={faBroom} />}
                  onClick={handleClearReport}
                  disabled={activeReport.sections.length === 0}
                >
                  Clear
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<FontAwesomeIcon icon={faTrash} />}
                  onClick={handleDeleteReport}
                >
                  Delete
                </Button>
              </Box>
            </Box>

            {/* Sections */}
            {activeReport.sections.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No sections added yet
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Click "Add to Report" on any widget to get started
                </Typography>
              </Box>
            ) : (
              <DroppableSectionsList
                sections={activeReport.sections}
                onRemove={(sectionId) => {
                  dispatch({
                    type: "removeSectionFromReport",
                    reportSectionId: sectionId,
                  });
                }}
                onViewChange={(sectionId, view) => {
                  dispatch({
                    type: "updateSectionView",
                    reportSectionId: sectionId,
                    selectedView: view,
                  });
                }}
              />
            )}
          </>
        )}
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Report</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            autoFocus
            label="Report Name"
            fullWidth
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained" disabled={!editName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      </DragDropProvider>
    </Drawer>
  );
};

export default ReportBuilder;
