import React, { ReactNode, useState } from "react";
import {
  Button,
  Menu,
  MenuItem,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { useReportBuilder } from "../../providers/ReportBuilderProvider";
import { ReportSectionDefinition, ReportRequest, ReportSectionViewType } from "../../types/report";

interface AddToReportButtonProps {
  definition: ReportSectionDefinition;
  request: ReportRequest;
  renderedBody: ReactNode;
  renderedChart?: ReactNode;
  description: ReactNode;
  entity: string;
  selectedView: ReportSectionViewType;
  tags?: string[];
  chipText?: string;
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

/**
 * Button component to add a widget to a report
 * Can be integrated directly into SectionItem
 */
export const AddToReportButton: React.FC<AddToReportButtonProps> = ({
  definition,
  request,
  renderedBody,
  renderedChart,
  description,
  selectedView,
  entity,
  tags,
  chipText,
  variant = "outlined",
  size = "small",
  showLabel = true,
}) => {
  const { state, dispatch, activeReport } = useReportBuilder();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddToActiveReport = () => {
    if (activeReport) {

        console.log(renderedBody, renderedChart)
      // Ensure rendered content is properly captured
      const capturedBody = renderedBody ? (
        <Box sx={{ width: "100%" }}>
          {<renderedBody />}
        </Box>
      ) : null;
      
      const capturedChart = renderedChart ? (
        <Box sx={{ width: "100%" }}>
          {renderedChart}
        </Box>
      ) : null;

      dispatch({
        type: "addSectionToReport",
        definition,
        request,
        renderedContent: {
          body: capturedBody,
          chart: capturedChart,
          description: description,
        },
        selectedView,
        tags,
        chipText,
      });
      handleMenuClose();
    }
  };

  const handleCreateNewReport = () => {
    dispatch({
      type: "createReport",
      reportName: newReportName || "Untitled Report",
      description: newReportDescription,
      entityContext: {
        type: entity,
      },
    });

    // After creating report, add the section
    setTimeout(() => {
      // Ensure rendered content is properly captured
      const capturedBody = renderedBody ? (
        <Box sx={{ width: "100%" }}>
          {renderedBody}
        </Box>
      ) : null;
      
      const capturedChart = renderedChart ? (
        <Box sx={{ width: "100%" }}>
          {renderedChart}
        </Box>
      ) : null;

      dispatch({
        type: "addSectionToReport",
        definition,
        request,
        renderedContent: {
          body: capturedBody,
          chart: capturedChart,
          description,
        },
        selectedView,
        tags,
        chipText,
      });
    }, 0);

    setCreateDialogOpen(false);
    setNewReportName("");
    setNewReportDescription("");
    handleMenuClose();
  };

  const handleOpenCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewReportName("");
    setNewReportDescription("");
  };

  const reportsCount = state.reports.size;

  return (
    <>
      <Badge badgeContent={state.totalSectionsCount} color="primary">
        <Button
          variant={variant}
          size={size}
          startIcon={<FontAwesomeIcon icon={faPlus} />}
          onClick={handleMenuClick}
          sx={{
            textTransform: "none",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {showLabel && "Add to Report"}
        </Button>
      </Badge>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {activeReport && (
          <>
            <MenuItem
              onClick={handleAddToActiveReport}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                backgroundColor: "rgba(25, 103, 210, 0.08)",
                fontWeight: 500,
              }}
            >
              <span>Add to "{activeReport.name}"</span>
              <FontAwesomeIcon icon={faFloppyDisk} />
            </MenuItem>
            {reportsCount > 1 && <div style={{ borderBottom: "1px solid #e0e0e0" }} />}
          </>
        )}

        {Array.from(state.reports.values())
          .filter((r) => r.id !== activeReport?.id)
          .map((report) => (
            <MenuItem
              key={report.id}
              onClick={() => {
                dispatch({
                  type: "setActiveReport",
                  reportId: report.id,
                });
                handleAddToActiveReport();
              }}
            >
              Add to "{report.name}"
            </MenuItem>
          ))}

        <div style={{ borderBottom: "1px solid #e0e0e0" }} />
        <MenuItem onClick={handleOpenCreateDialog} sx={{ color: "primary.main" }}>
          + Create New Report
        </MenuItem>
      </Menu>

      {/* Create New Report Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Report</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            autoFocus
            label="Report Name"
            fullWidth
            value={newReportName}
            onChange={(e) => setNewReportName(e.target.value)}
            placeholder="e.g., Disease Analysis Report"
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={newReportDescription}
            onChange={(e) => setNewReportDescription(e.target.value)}
            placeholder="Add notes about this report..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button
            onClick={handleCreateNewReport}
            variant="contained"
            disabled={!newReportName.trim()}
          >
            Create & Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddToReportButton;
