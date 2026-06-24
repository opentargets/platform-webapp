import { faFilter } from "@fortawesome/free-solid-svg-icons";
import { Box, Divider, Popover, Switch, Typography } from "@mui/material";
import { type MouseEvent, type ReactElement, useState } from "react";
import { FacetsSelect, PopoverButton } from "ui";
import {  setIncludeMeasurements } from "../../context/aotfActions";
import { useAotfQueryState, useAotfQueryDispatch } from "../../context/AssociationsQueryContext";

function FacetsSearch(): ReactElement {
  const { entityToGet, id, facetFilters, includeMeasurements } = useAotfQueryState();
  const { facetFilterSelect, dispatch } = useAotfQueryDispatch();

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const popoverId = open ? "simple-popover" : undefined;

  return (
    <Box>
      <PopoverButton
        popoverId={popoverId}
        open={open}
        icon={faFilter}
        label="Advanced filters"
        handleClick={handleClick}
        ariaLabel="Advanced filters"
        disableElevation
        iconSize="lg"
        sx={{ height: 1, maxHeight: "45px" }}
        testId="facets-search-button"
      />

      <Popover
        data-testid="facets-popover"
        id={popoverId}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        disableScrollLock
        elevation={1}
      >
        <Box sx={{ width: "450px", display: "flex", p: 3, flexDirection: "column", gap: 2 }}>
          {entityToGet === "disease" && (
            <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2">Exclude measurements</Typography>
              <Switch size="small" color="primary" checked={!includeMeasurements} onChange={() => dispatch(setIncludeMeasurements(!includeMeasurements))} />
            </Box>
          <Divider />
            </>
          )}
          <FacetsSelect
            id={id}
            entityToGet={entityToGet}
            onFacetSelect={facetFilterSelect}
            parentState={facetFilters}
          />
        </Box>
      </Popover>
    </Box>
  );
}
export default FacetsSearch;
