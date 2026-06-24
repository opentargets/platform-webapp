import { MouseEvent } from "react";
import { ToggleButtonGroup, ToggleButton, styled } from "@mui/material";
import { useAotfQueryState } from "../../context/AssociationsQueryContext";
import { useAotfURLState } from "../../context/AssociationsURLContext";
import { DISPLAY_MODE } from "../../associationsUtils"; // Ensure DISPLAY_MODE is properly typed

type DisplayMode = (typeof DISPLAY_MODE)[keyof typeof DISPLAY_MODE];

function getAssocLabel(entity: string): string {
  if (entity === "disease") return "Target-disease association";
  return "Target-disease association";
}

const StyledToggleButtonGroup = styled(ToggleButtonGroup)`
  // padding: 0;
`;

function DisplayModeSwitch() {
  // Type context return values
  const { entity } = useAotfQueryState();
  const { displayedTable, setDisplayedTable } = useAotfURLState();

  // Type the parameters for the event and newAlignment
  const handleChange = (event: MouseEvent<HTMLElement>, newAlignment: DisplayMode | null) => {
    event.preventDefault();
    if (
      newAlignment === DISPLAY_MODE.PRIORITISATION ||
      newAlignment === DISPLAY_MODE.ASSOCIATIONS
    ) {
      setDisplayedTable(newAlignment);
    }
  };

  const associationsLabel = getAssocLabel(entity);

  return (
    <StyledToggleButtonGroup
      data-testid="display-mode-switch"
      value={displayedTable}
      exclusive
      onChange={handleChange}
      aria-label="Visualization switch"
    >
      <ToggleButton 
        data-testid="associations-view-button"
        aria-label="Switch to Association view" 
        value={DISPLAY_MODE.ASSOCIATIONS}
      >
        {associationsLabel}
      </ToggleButton>
      {entity === "disease" && (
        <ToggleButton
          data-testid="prioritisation-view-button"
          aria-label="Switch to Prioritisation view"
          value={DISPLAY_MODE.PRIORITISATION}
        >
          Target prioritisation factors
        </ToggleButton>
      )}
    </StyledToggleButtonGroup>
  );
}

export default DisplayModeSwitch;
