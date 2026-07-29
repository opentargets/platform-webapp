import { faChartPie } from "@fortawesome/free-solid-svg-icons";
import { MenuList, Popover } from "@mui/material";
import type { MouseEvent } from "react";
import { useState } from "react";
import { PopoverButton, usePermissions } from "ui";
import { ENTITIES } from "../associationsUtils";
import { useAotfQueryState } from "../context/AssociationsQueryContext";
import GeneEnrichmentAnalysis from "./GeneEnrichmentAnalysis";

function AnalysisMenu() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { entityToGet } = useAotfQueryState();
  const { isPartnerPreview } = usePermissions();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  if (entityToGet === ENTITIES.DISEASE) {
    return null;
  }

  if(!isPartnerPreview) {
    // return null;
  }

  return (
    <>
      <PopoverButton
        popoverId={id}
        open={open}
        icon={faChartPie}
        label="Analysis"
        handleClick={handleClick}
        ariaLabel="Advanced options"
        disableElevation
        iconSize="lg"
        sx={{ height: 1, maxHeight: "45px" }}
      />

      <Popover
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
          <GeneEnrichmentAnalysis />
        </MenuList>
      </Popover>
    </>
  );
}

export default AnalysisMenu;
