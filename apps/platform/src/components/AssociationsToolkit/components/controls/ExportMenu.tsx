import { faFileArrowDown, faPlay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { MouseEvent } from "react";
import { useState } from "react";
import {
  PopoverButton,
  ButtonNoBorder,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Popover,
} from "ui";
import AotfApiPlayground from "./AotfApiPlayground";
import DataDownloader from "../data/DataDownloader";

function ExportMenu() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [playgroundOpen, setPlaygroundOpen] = useState(false);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openPlayground = () => {
    handleClose();
    setPlaygroundOpen(true);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  return (
    <>
      <PopoverButton
        popoverId={id}
        testId="export-button"
        open={open}
        icon={faFileArrowDown}
        label="Export"
        handleClick={handleClick}
        ariaLabel="Advanced options"
        disableElevation
        iconSize="lg"
        sx={{ height: 1, maxHeight: "45px" }}
        as={ButtonNoBorder}
      />

      <Popover
        data-testid="export-popover"
        disableScrollLock
        id={id}
        anchorEl={anchorEl}
        onClose={handleClose}
        open={open}
        elevation={1}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <MenuList dense>
          <DataDownloader />
          <MenuItem
            onClick={openPlayground}
            sx={{ "&>.MuiListItemIcon-root>svg": { fontSize: "1rem" } }}
          >
            <ListItemIcon>
              <FontAwesomeIcon icon={faPlay} />
            </ListItemIcon>
            <ListItemText>API query</ListItemText>
          </MenuItem>
        </MenuList>
      </Popover>

      {/* Rendered outside the MenuList so its type-ahead does not take the
          keystrokes typed in the playground (issues#4309). */}
      <AotfApiPlayground open={playgroundOpen} onClose={() => setPlaygroundOpen(false)} />
    </>
  );
}

export default ExportMenu;
