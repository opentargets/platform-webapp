import { faGear } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  ClickAwayListener,
  FormControlLabel,
  FormGroup,
  List,
  ListItemButton,
} from "@mui/material";
import { type MouseEvent, type ReactElement, useState } from "react";
import Popper from "../Popper";
import type { OtTableColumnVisibilityProps } from "./table.types";

function OtTableColumnVisibility({ table }: OtTableColumnVisibilityProps): ReactElement {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>();
  const open = Boolean(anchorEl);
  const id = open ? "column-visibility-button" : undefined;

  function handleClick(event: MouseEvent<HTMLElement>): void {
    setAnchorEl(event.currentTarget);
  }

  function handleClose(): void {
    setAnchorEl(null);
  }

  function isColumnDisable(column): boolean {
    return (
      !column.getCanHide() || (table.getVisibleLeafColumns().length === 1 && column.getIsVisible())
    );
  }

  function getIsAllColumnsVisible(): boolean {
    return table.getIsAllColumnsVisible();
  }

  return (
    <>
      <Badge color="primary" variant="dot" invisible={getIsAllColumnsVisible()}>
        <Button aria-describedby={id} onClick={handleClick} sx={{ display: "flex", gap: 1 }}>
          <FontAwesomeIcon icon={faGear} /> Columns
        </Button>
      </Badge>

      <Popper id={id} open={open} anchorEl={anchorEl}>
        <ClickAwayListener onClickAway={handleClose}>
          <Box>
            <FormGroup>
              <List sx={{ p: 0 }} aria-label="column-visibility-list">
                {table.getAllLeafColumns().map((column) => (
                  <ListItemButton key={column.id} sx={{ px: 1.5, py: 0.2, typography: "caption" }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          onChange={column.getToggleVisibilityHandler()}
                          checked={column.getIsVisible()}
                        />
                      }
                      disabled={isColumnDisable(column)}
                      label={column.columnDef.header || column.id}
                    />
                  </ListItemButton>
                ))}
              </List>
            </FormGroup>
          </Box>
        </ClickAwayListener>
      </Popper>
    </>
  );
}
export default OtTableColumnVisibility;
