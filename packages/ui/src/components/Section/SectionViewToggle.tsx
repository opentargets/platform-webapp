import { faChartLine, faTableColumns } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { VIEW } from "@ot/constants";
import { type MouseEvent, type ReactElement, useState } from "react";

type SectionViewToggleProps = {
  defaultValue: string;
  viewChange: (s: string) => void;
};

const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  padding: 0;
`;

const StyledToggleButton = styled(ToggleButton)(({ theme }) => ({
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
}));

function SectionViewToggle({
  defaultValue = VIEW.table,
  viewChange,
}: SectionViewToggleProps): ReactElement {
  const [sectionView, setView] = useState(defaultValue);

  const handleViewChange = (event: MouseEvent) => {
    event.preventDefault();
    if (event.target.value) {
      setView(event.target.value);
      if (viewChange) viewChange(event.target.value);
    }
  };

  return (
    <StyledToggleButtonGroup
      sx={{ typography: "body2" }}
      value={sectionView}
      onChange={handleViewChange}
    >
      <StyledToggleButton
        aria-label="Switch to table view"
        value={VIEW.table}
        data-testid="view-toggle-table"
      >
        <FontAwesomeIcon icon={faTableColumns} />
        {VIEW.table} view
      </StyledToggleButton>
      <StyledToggleButton
        aria-label="Switch to chart view"
        value={VIEW.chart}
        data-testid="view-toggle-chart"
      >
        <FontAwesomeIcon icon={faChartLine} />
        {VIEW.chart}
      </StyledToggleButton>
    </StyledToggleButtonGroup>
  );
}
export default SectionViewToggle;
