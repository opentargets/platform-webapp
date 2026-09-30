import React, { useState } from "react";
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
} from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faFloppyDisk } from "@fortawesome/free-solid-svg-icons";
import { useReportBuilder } from "../../providers/ReportBuilderProvider";
import { useReportComponentState } from "../../providers/ReportComponentStateContext";
import {
  ReportBuilderAction,
  ReportSectionDefinition,
  ReportRequest,
  ReportSectionViewType,
} from "../../types/report";
import { toStorableBodyProps } from "../../providers/SectionBodyPropsContext";

interface AddToReportButtonProps {
  definition: ReportSectionDefinition;
  request: ReportRequest;
  entity: string;
  selectedView: ReportSectionViewType;
  tags?: string[];
  chipText?: string;
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  // Callback to capture component state (filters, selected rows, etc.)
  onCaptureState?: () => Record<string, any>;
  // Props the section Body was mounted with, replayed when the report rebuilds it
  bodyProps?: Record<string, unknown> | null;
}

/**
 * Button component to add a widget to a report
 * Can be integrated directly into SectionItem
 */
export const AddToReportButton: React.FC<AddToReportButtonProps> = ({
  definition,
  request,
  selectedView,
  entity,
  tags,
  chipText,
  variant = "outlined",
  size = "small",
  showLabel = true,
  onCaptureState,
  bodyProps,
}) => {
  const { state, dispatch, activeReport } = useReportBuilder();
  const reportComponentState = useReportComponentState();
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

  /**
   * The stored section: the request (data + variables), the entity it describes, the
   * widget's captured state and the props its Body was mounted with. No rendered
   * nodes: the report rebuilds the Body from the registry (see useReportSectionRenderer).
   */
  const buildAddAction = (): Extract<ReportBuilderAction, { type: "addSectionToReport" }> => {
    // The entity ID is the identifier for the current entity (disease ID, gene ID, etc.)
    // The entity label is the name/symbol (used in descriptions and visualizations)
    const entityData = request?.data?.[entity] as { id?: string; name?: string; symbol?: string } | undefined;
    const entityId = entityData?.id;
    const entityLabel = entityData?.name || entityData?.symbol;
    const componentState = onCaptureState?.() || reportComponentState?.getAllState() || {};
    return {
      type: "addSectionToReport",
      definition,
      request,
      entityId,
      entityLabel,
      selectedView,
      tags,
      chipText,
      componentState,
      bodyProps: toStorableBodyProps(bodyProps),
    };
  };

  const handleAddToActiveReport = () => {
    if (activeReport) {
      dispatch(buildAddAction());
      handleMenuClose();
    }
  };

  const handleCreateNewReport = () => {
    dispatch({
      type: "createReport",
      reportName: newReportName || "Untitled Narrative",
      description: newReportDescription,
      entityContext: {
        type: entity,
      },
    });
    // The store applies createReport synchronously, so the new report is already active
    dispatch(buildAddAction());

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
          {showLabel && "Add to Narrative"}
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
          + Create New Narrative
        </MenuItem>
      </Menu>

      {/* Create New Report Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        maxWidth="sm"
        fullWidth
      >
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
