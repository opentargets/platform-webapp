import { faFileArrowDown } from "@fortawesome/free-solid-svg-icons";
import { MenuList, Popover } from "@mui/material";
import type { MouseEvent } from "react";
import { useState } from "react";
import { PopoverButton } from "ui";
import AotfApiPlayground from "./AotfApiPlayground";
import DataDownloader from "../data/DataDownloader";

function ExportMenu() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
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
          <AotfApiPlayground />
        </MenuList>
      </Popover>
    </>
  );
}

export default ExportMenu;
