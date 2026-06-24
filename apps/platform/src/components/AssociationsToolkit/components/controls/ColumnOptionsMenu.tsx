import { useState } from "react";
import { Button, Box } from "@mui/material";
import { faCaretUp, faCaretDown, faGear } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { styled } from "@mui/material/styles";

import { useAotfURLState } from "../../context/AssociationsURLContext";

const StyledBotton = styled(Button)({
  border: "none",
  "& .MuiButton-startIcon": {
    fontSize: "14px !important",
  },
});

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
      <StyledBotton
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
      </StyledBotton>
    </>
  );
}

export default DataMenu;
