import React, { useState } from "react";
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faPlus } from "@fortawesome/free-solid-svg-icons";
import type { ReportBuilderActionOf } from "../core";
import { useReportBuilder } from "../react";

/** What the host captures when the user picks a report: everything but the action type. */
export type AddSectionPayload = Omit<ReportBuilderActionOf<"addSectionToReport">, "type">;

export interface AddToReportMenuButtonProps {
  /** Called when a report is chosen (or created); returns the section to store. */
  capture: () => AddSectionPayload;
  /** Entity type recorded on a report created from this button. */
  entityType?: string;
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  label?: string;
}

/**
 * "Add to report" menu: add to the active report, to another one, or create a new
 * one and add. The host supplies `capture`; the button owns the menu and dialog.
 */
export const AddToReportMenuButton: React.FC<AddToReportMenuButtonProps> = ({
  capture,
  entityType,
  variant = "outlined",
  size = "small",
  showLabel = true,
  label = "Add to Narrative",
}) => {
  const { state, dispatch, activeReport } = useReportBuilder();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");

  const handleMenuClose = () => setAnchorEl(null);

  const addToActive = () => {
    dispatch({ type: "addSectionToReport", ...capture() });
  };

  const handleAddToActiveReport = () => {
    if (activeReport) {
      addToActive();
      handleMenuClose();
    }
  };

  const handleCreateNewReport = () => {
    dispatch({
      type: "createReport",
      reportName: newReportName || "Untitled Narrative",
      description: newReportDescription,
      entityContext: entityType ? { type: entityType } : undefined,
    });
    // The store applies createReport synchronously, so the new report is already active
    addToActive();
    setCreateDialogOpen(false);
    setNewReportName("");
    setNewReportDescription("");
    handleMenuClose();
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
          onClick={(event) => setAnchorEl(event.currentTarget)}
          sx={{ textTransform: "none", fontWeight: 500, whiteSpace: "nowrap" }}
        >
          {showLabel && label}
        </Button>
      </Badge>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        {activeReport && [
          <MenuItem
            key="active-report"
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
          </MenuItem>,
          reportsCount > 1 && (
            <div key="active-report-divider" style={{ borderBottom: "1px solid #e0e0e0" }} />
          ),
        ]}

        {Array.from(state.reports.values())
          .filter((r) => r.id !== activeReport?.id)
          .map((report) => (
            <MenuItem
              key={report.id}
              onClick={() => {
                dispatch({ type: "setActiveReport", reportId: report.id });
                addToActive();
                handleMenuClose();
              }}
            >
              Add to "{report.name}"
            </MenuItem>
          ))}

        <div style={{ borderBottom: "1px solid #e0e0e0" }} />
        <MenuItem onClick={() => setCreateDialogOpen(true)} sx={{ color: "primary.main" }}>
          + Create New Narrative
        </MenuItem>
      </Menu>

      <Dialog open={createDialogOpen} onClose={handleCloseCreateDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Narrative</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            autoFocus
            label="Narrative Name"
            fullWidth
            value={newReportName}
            onChange={(e) => setNewReportName(e.target.value)}
            placeholder="e.g., Disease Analysis Narrative"
          />
          <TextField
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={newReportDescription}
            onChange={(e) => setNewReportDescription(e.target.value)}
            placeholder="Add notes about this narrative..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button onClick={handleCreateNewReport} variant="contained" disabled={!newReportName.trim()}>
            Create & Add
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddToReportMenuButton;
