import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tab,
  Tabs,
  Chip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faTrash, faDownload, faPen, faBroom } from "@fortawesome/free-solid-svg-icons";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { arrayMove } from "@dnd-kit/sortable";
import { useReportBuilder } from "../../providers/ReportBuilderProvider";
import { NonWidgetBlock } from "../../types/report";
import { ReportSectionList } from "./ReportSectionList";
import { ReportSectionInspector } from "./ReportSectionInspector";
import { BlockInserterMenu } from "./BlockInserterMenu";
import { BlockEditorProvider, InserterRequest } from "./blocks/BlockEditorContext";
import { ExportDialog } from "./export/ui/ExportDialog";

const NEW_REPORT_TAB = "__new-report__";

const compactButtonSx = { height: 32, textTransform: "none" } as const;

/**
 * Main Report Builder Component
 */
interface ReportBuilderProps {
  drawerWidth?: number | string;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ drawerWidth = "90vw" }) => {
  const { state, dispatch, activeReport } = useReportBuilder();
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));
  const [dialogMode, setDialogMode] = useState<"edit" | "create" | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  // Collapsible rows start expanded; this tracks the ones the user collapsed
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  // The block shown in the inspector: the last one clicked or focused
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inserterRequest, setInserterRequest] = useState<InserterRequest | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // New blocks are selected so the inspector shows them (and are expanded, being new ids)
  const handleInserted = useCallback((block: NonWidgetBlock) => {
    setSelectedSectionId(block.reportSectionId);
  }, []);

  // Everything expanded, nothing selected, whenever the drawer opens or the report changes
  useEffect(() => {
    setCollapsedIds(new Set());
    setSelectedSectionId(null);
  }, [state.activeReportId, state.isBuilderOpen]);

  // Drop the selection if the selected block was removed
  const selectedSection =
    activeReport?.sections.find((s) => s.reportSectionId === selectedSectionId) ?? null;
  useEffect(() => {
    if (selectedSectionId && !selectedSection) setSelectedSectionId(null);
  }, [selectedSectionId, selectedSection]);

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
      setDialogMode("edit");
    }
  };

  const handleOpenCreateDialog = () => {
    setEditName("");
    setEditDescription("");
    setDialogMode("create");
  };

  const handleSaveDialog = () => {
    if (!editName.trim()) return;
    if (dialogMode === "create") {
      dispatch({
        type: "createReport",
        reportName: editName,
        description: editDescription,
      });
    } else if (activeReport) {
      dispatch({
        type: "renameReport",
        reportId: activeReport.id,
        newName: editName,
        description: editDescription,
      });
    }
    setDialogMode(null);
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

  const reports = Array.from(state.reports.values());
  const hasSections = !!activeReport && activeReport.sections.length > 0;

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
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(event) => {
          setIsDragging(false);
          if (event.canceled || !activeReport) return;

          const { source } = event.operation;
          if (!isSortable(source)) return;

          const { initialIndex, index } = source;
          if (initialIndex !== index) {
            dispatch({
              type: "reorderSections",
              newOrder: arrayMove(activeReport.sections, initialIndex, index),
            });
          }
        }}
      >
        <AppBar position="relative" elevation={0}>
          <Toolbar sx={{ gap: 1 }}>
            <Typography variant="h6" noWrap sx={{ flex: 1, fontWeight: 600 }}>
              Report Builder{activeReport ? ` · ${activeReport.name}` : ""}
            </Typography>
            {activeReport && (
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FontAwesomeIcon icon={faDownload} />}
                onClick={() => setExportOpen(true)}
                sx={{ ...compactButtonSx, borderColor: "rgba(255,255,255,0.7)" }}
              >
                Export
              </Button>
            )}
            <IconButton color="inherit" onClick={handleCloseBuilder} aria-label="Close report builder">
              <FontAwesomeIcon icon={faXmark} />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Tab Navigation for multiple reports */}
        <Tabs
          value={activeReport?.id ?? false}
          onChange={(_, value: string) => {
            if (value === NEW_REPORT_TAB) {
              handleOpenCreateDialog();
              return;
            }
            dispatch({ type: "setActiveReport", reportId: value });
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: "1px solid", borderColor: "grey.300", flexShrink: 0 }}
        >
          {reports.map((report) => (
            <Tab
              key={report.id}
              value={report.id}
              sx={{ textTransform: "none" }}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {report.name}
                  <Chip label={report.sections.length} size="small" />
                </Box>
              }
            />
          ))}
          <Tab value={NEW_REPORT_TAB} label="+ New report" sx={{ textTransform: "none" }} />
        </Tabs>

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
            {/* Report actions */}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                px: "18px",
                py: 1,
                borderBottom: "1px solid",
                borderColor: "grey.300",
                flexShrink: 0,
              }}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<FontAwesomeIcon icon={faPen} />}
                onClick={handleOpenEditDialog}
                sx={compactButtonSx}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FontAwesomeIcon icon={faBroom} />}
                onClick={handleClearReport}
                disabled={activeReport.sections.length === 0}
                sx={compactButtonSx}
              >
                Clear
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<FontAwesomeIcon icon={faTrash} />}
                onClick={handleDeleteReport}
                sx={compactButtonSx}
              >
                Delete
              </Button>
            </Box>

            {/* Two-pane layout: section list + inspector */}
            <BlockEditorProvider
              report={activeReport}
              openInserter={setInserterRequest}
              onInserted={handleInserted}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateColumns: isNarrow ? "minmax(0,1fr)" : "minmax(0,1fr) 296px",
                  gridTemplateRows: "minmax(0,1fr)",
                }}
              >
                {!hasSections ? (
                  <Box sx={{ textAlign: "center", py: 4, bgcolor: "grey.50" }}>
                    <Typography variant="body2" color="text.secondary">
                      No sections added yet
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Click "Add to Report" on any widget to get started
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        aria-haspopup="dialog"
                        onClick={(e) => setInserterRequest({ insertIndex: 0, anchorEl: e.currentTarget })}
                        sx={compactButtonSx}
                      >
                        + Add a block
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <ReportSectionList
                    sections={activeReport.sections}
                    isDragging={isDragging}
                    collapsedIds={collapsedIds}
                    onToggleCollapsed={toggleCollapsed}
                    onSetCollapsed={setCollapsedIds}
                    selectedSectionId={selectedSectionId}
                    onSelect={setSelectedSectionId}
                    renderInlineInspector={
                      isNarrow
                        ? (section) => (
                            <ReportSectionInspector
                              report={activeReport}
                              section={section}
                              variant="inline"
                            />
                          )
                        : undefined
                    }
                    footer={
                      isNarrow && !selectedSection ? (
                        <Box sx={{ border: "1px solid", borderColor: "grey.300", mt: 2 }}>
                          <ReportSectionInspector report={activeReport} section={null} variant="inline" />
                        </Box>
                      ) : undefined
                    }
                  />
                )}
                {!isNarrow && <ReportSectionInspector report={activeReport} section={selectedSection} />}
              </Box>
              <BlockInserterMenu request={inserterRequest} onClose={() => setInserterRequest(null)} />
            </BlockEditorProvider>
          </>
        )}

        {/* Edit / Create Dialog */}
        <Dialog open={dialogMode !== null} onClose={() => setDialogMode(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{dialogMode === "create" ? "New Report" : "Edit Report"}</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              autoFocus
              label="Report Name"
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ mt: 1 }}
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
            <Button onClick={() => setDialogMode(null)}>Cancel</Button>
            <Button onClick={handleSaveDialog} variant="contained" disabled={!editName.trim()}>
              {dialogMode === "create" ? "Create" : "Save"}
            </Button>
          </DialogActions>
        </Dialog>

        {activeReport && (
          <ExportDialog report={activeReport} open={exportOpen} onClose={() => setExportOpen(false)} />
        )}
      </DragDropProvider>
    </Drawer>
  );
};

export default ReportBuilder;
