import { useState } from "react";
import { Box, ButtonNoBorder } from "ui";
import { faCaretUp, faCaretDown, faGear } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { useAotfURLState } from "../../context/AssociationsURLContext";

function DataMenu() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const { displayedTable, activeHeadersControlls, setActiveHeadersControlls } = useAotfURLState();

  const isPrioritisation = displayedTable === "prioritisations";

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setActiveHeadersControlls(!activeHeadersControlls);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <>
      <ButtonNoBorder
        data-testid="column-options-button"
        aria-describedby={id}
        onClick={handleClick}
        variant="text"
        disableElevation
        disabled={isPrioritisation}
        sx={{ height: 1, maxHeight: "45px" }}
        aria-label="Advanced options"
      >
        <Box component="span" sx={{ mr: 1 }}>
          <FontAwesomeIcon icon={faGear} size="lg" />
        </Box>
        Column options
        <Box component="span" sx={{ ml: 1 }}>
          {activeHeadersControlls ? (
            <FontAwesomeIcon icon={faCaretUp} />
          ) : (
            <FontAwesomeIcon icon={faCaretDown} />
          )}
        </Box>
      </ButtonNoBorder>
    </>
  );
}

export default DataMenu;
