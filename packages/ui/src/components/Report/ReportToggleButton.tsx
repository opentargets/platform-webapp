import React from "react";
import { Fab, Badge, Tooltip } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardList } from "@fortawesome/free-solid-svg-icons";
import { useReportBuilder } from "../../providers/ReportBuilderProvider";

/**
 * Floating Action Button to toggle Report Builder drawer
 * Shows badge with total count of sections across all reports
 */
export const ReportToggleButton: React.FC = () => {
  const { state, dispatch } = useReportBuilder();
  
  const totalSections = Array.from(state.reports.values()).reduce(
    (sum, report) => sum + report.sections.length,
    0
  );

  const handleToggle = () => {
    dispatch({
      type: "toggleBuilderOpen",
      isOpen: !state.isBuilderOpen,
    });
  };

  return (
    <Tooltip title={`Reports (${totalSections} sections)`}>
      <Badge badgeContent={totalSections} color="primary">
        <Fab
          color="primary"
          aria-label="view reports"
          onClick={handleToggle}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 999,
          }}
        >
          <FontAwesomeIcon icon={faClipboardList} />
        </Fab>
      </Badge>
    </Tooltip>
  );
};

export default ReportToggleButton;
